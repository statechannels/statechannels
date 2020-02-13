import {Store} from './store/memory-store';
import {MessagingServiceInterface} from './messaging';

import {applicationWorkflow} from './workflows/application';
import ReactDOM from 'react-dom';
import React from 'react';
import WalletUi from './ui/wallet';
import {interpret, Interpreter} from 'xstate';
import {Guid} from 'guid-typescript';
import {convertToOpenEvent} from './utils/workflow-utils';
export interface Workflow {
  id: string;
  machine: Interpreter<any, any, any>;
  domain: string; // TODO: Is this useful?
}
export class ChannelWallet {
  private workflows: Workflow[];

  constructor(private store: Store, private messagingService: MessagingServiceInterface) {
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
      .onDone(() => (this.workflows = this.workflows.filter(w => w.id !== workflowId)))
      .start();
    // TODO: Figure out how to resolve rendering priorities
    this.renderUI(machine);

    return {id: workflowId, machine, domain: 'TODO'};
  }

  private renderUI(machine) {
    ReactDOM.render(
      React.createElement(WalletUi, {workflow: machine}),
      document.getElementById('root')
    );
  }

  public async pushMessage(message) {
    // Update the store first
    await this.store.pushMessage(message);
    // Update any workflows waiting on an observable
    await this.messagingService.receiveMessage(message);
  }

  public onSendMessage(callback: (message) => void) {
    this.messagingService.outboxFeed.subscribe(m => callback(m));
  }
}
