import {Store} from './store/memory-store';
import {MessagingServiceInterface} from './messaging';

import {applicationWorkflow} from './workflows/application';
import ReactDOM from 'react-dom';
import React from 'react';
import WalletUi from './ui/wallet';
import {interpret, Interpreter, State} from 'xstate';
import {Guid} from 'guid-typescript';
import {convertToOpenEvent} from './utils/workflow-utils';
import {Notification, Response} from '@statechannels/client-api-schema';

export interface Workflow {
  id: string;
  machine: Interpreter<any, any, any>;
  domain: string; // TODO: Is this useful?
}
export class ChannelWallet {
  public workflows: Workflow[];

  constructor(
    private store: Store,
    private messagingService: MessagingServiceInterface,
    public id?: string
  ) {
    this.workflows = [];
    // Whenever the store wants to send something call sendMessage
    store.outboxFeed.subscribe(m => this.messagingService.sendMessageNotification(m));

    this.messagingService.requestFeed.subscribe(r => {
      if (r.method === 'CreateChannel' || r.method === 'JoinChannel') {
        const workflow = this.startApplicationWorkflow();
        this.workflows.push(workflow);

        workflow.machine.send(convertToOpenEvent(r));
      }
    });
  }

  private startApplicationWorkflow(): Workflow {
    const workflowId = Guid.create().toString();
    const machine = interpret<any, any, any>(
      applicationWorkflow(this.store, this.messagingService),
      {
        devTools: true
      }
    )
      .onTransition((state, event) => logTransition(state, event, this.id))

      .onDone(() => (this.workflows = this.workflows.filter(w => w.id !== workflowId)))
      .start();
    // TODO: Figure out how to resolve rendering priorities
    this.renderUI(machine);

    return {id: workflowId, machine, domain: 'TODO'};
  }

  private renderUI(machine) {
    if (document.getElementById('root')) {
      ReactDOM.render(
        React.createElement(WalletUi, {workflow: machine}),
        document.getElementById('root')
      );
    }
  }

  public async pushMessage(jsonRpcMessage) {
    // Update any workflows waiting on an observable
    await this.messagingService.receiveMessage(jsonRpcMessage);
  }

  public onSendMessage(callback: (jsonRpcMessage: Notification | Response) => void) {
    this.messagingService.outboxFeed.subscribe(m => callback(m));
  }
}

function logTransition(
  state: State<any, any, any, any>,
  event,
  id?: string,
  logger = console
): void {
  const to = JSON.stringify(state.value);
  if (!state.history) {
    logger.log(`${id || ''} - STARTED ${state.configuration[0].id} TRANSITIONED TO ${to}`);
  } else {
    const from = JSON.stringify(state.history.value);
    const eventType = JSON.stringify(event.type ? event.type : event);

    logger.log(`${id || ''} - TRANSITION FROM ${from} EVENT ${eventType} TO  ${to}`);
  }
  Object.keys(state.children).forEach(k => {
    const child = state.children[k];

    if (child.state && 'onTransition' in child) {
      const subId = (child as any).state.configuration[0].id;
      (child as any).onTransition((state, event) =>
        logTransition(state, event, `${id} - ${subId}`)
      );
    }
  });
}
