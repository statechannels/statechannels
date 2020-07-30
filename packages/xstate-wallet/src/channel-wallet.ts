import ReactDOM from 'react-dom';
import React from 'react';
import {interpret, Interpreter, State} from 'xstate';
import {Guid} from 'guid-typescript';
import {Notification, Response, ErrorResponse} from '@statechannels/client-api-schema';
import {filter, take} from 'rxjs/operators';
import {
  Message,
  isOpenChannel,
  OpenChannel,
  serializeChannelEntry
} from '@statechannels/wallet-core';

import {AppRequestEvent} from './event-types';
import {Store} from './store';
import {ApproveBudgetAndFund, CloseLedgerAndWithdraw, Application} from './workflows';
import {ethereumEnableWorkflow} from './workflows/ethereum-enable';
import {Wallet as WalletUi} from './ui/wallet';
import {MessagingServiceInterface} from './messaging';
import {ADD_LOGS} from './config';
import {logger} from './logger';

export interface Workflow {
  id: string;
  service: Interpreter<any, any, any>;
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
    store.outboxFeed.subscribe(async (m: Message) => {
      this.messagingService.sendMessageNotification(m);
    });
    // Whenever an OpenChannel objective is received
    // we alert the user that there is a new channel
    // It is up to the app to call JoinChannel
    this.store.objectiveFeed.pipe(filter(isOpenChannel)).subscribe(async objective => {
      const channelEntry = await this.store
        .channelUpdatedFeed(objective.data.targetChannelId)
        .pipe(take(1))
        .toPromise();

      // TODO: Currently receiving a duplicate JOIN_CHANNEL event
      if (this.isWorkflowIdInUse(this.calculateWorkflowId(objective))) {
        logger.warn(
          `There is already a workflow running with id ${this.calculateWorkflowId(
            objective
          )}, no new workflow will be spawned`
        );
      } else {
        // Note that it's important to start the workflow first, before sending ChannelProposed.
        // This way, the workflow is listening to JOIN_CHANNEL right from the get go.
        this.startWorkflow(
          Application.workflow(this.store, this.messagingService, {
            type: 'JOIN_CHANNEL',
            fundingStrategy: objective.data.fundingStrategy,
            channelId: objective.data.targetChannelId,
            applicationDomain: 'TODO' // FIXME
          }),
          this.calculateWorkflowId(objective)
        );

        this.messagingService.sendChannelNotification('ChannelProposed', {
          ...serializeChannelEntry(channelEntry),
          fundingStrategy: objective.data.fundingStrategy
        });
      }
    });

    this.messagingService.requestFeed.subscribe(x => this.handleRequest(x));
  }

  private isWorkflowIdInUse(workflowId: string): boolean {
    return this.workflows.map(w => w.id).indexOf(workflowId) > -1;
  }

  public getWorkflow(workflowId: string): Workflow {
    const workflow = this.workflows.find(w => w.id === workflowId);
    if (!workflow) throw Error('Workflow not found');
    return workflow;
  }

  // Deterministic workflow ids for certain workflows allows us to avoid spawning a duplicate workflow if the app sends duplicate requests
  private calculateWorkflowId(request: AppRequestEvent | OpenChannel): string {
    switch (request.type) {
      case 'JOIN_CHANNEL':
        return `${request.type}-${request.channelId}`;
      case 'OpenChannel':
        return `JOIN_CHANNEL-${request.data.targetChannelId}`;
      case 'APPROVE_BUDGET_AND_FUND':
        return `${request.type}-${request.player.participantId}-${request.hub.participantId}`;
      default:
        return `${request.type}-${Guid.create().toString()}`;
    }
  }
  private handleRequest(request: AppRequestEvent) {
    const workflowId = this.calculateWorkflowId(request);
    switch (request.type) {
      case 'CREATE_CHANNEL': {
        if (!this.isWorkflowIdInUse(workflowId)) {
          this.startWorkflow(
            Application.workflow(this.store, this.messagingService, request),
            workflowId
          );
        } else {
          // TODO: To allow RPS to keep working we just warn about duplicate events
          // Eventually this could probably be an error
          logger.warn(
            `There is already a workflow running with id ${workflowId}, no new workflow will be spawned`
          );
        }
        break;
      }
      case 'JOIN_CHANNEL':
        this.getWorkflow(this.calculateWorkflowId(request)).service.send(request);
        break;
      case 'APPROVE_BUDGET_AND_FUND': {
        const workflow = this.startWorkflow(
          ApproveBudgetAndFund.machine(this.store, this.messagingService, {
            player: request.player,
            hub: request.hub,
            budget: request.budget,
            requestId: request.requestId
          }),
          workflowId,
          true // devtools
        );

        workflow.service.send(request);
        break;
      }
      case 'CLOSE_AND_WITHDRAW': {
        this.startWorkflow(
          CloseLedgerAndWithdraw.workflow(this.store, this.messagingService, {
            opponent: request.hub,
            player: request.player,
            requestId: request.requestId,
            domain: request.domain
          }),
          workflowId
        );
        break;
      }
      case 'ENABLE_ETHEREUM': {
        this.startWorkflow(
          ethereumEnableWorkflow(this.store, this.messagingService, {requestId: request.requestId}),
          workflowId
        );
        break;
      }
    }
  }
  private startWorkflow(machineConfig: any, workflowId: string, devTools = false): Workflow {
    if (this.isWorkflowIdInUse(workflowId)) {
      throw new Error(`There is already a workflow running with id ${workflowId}`);
    }
    const service = interpret(machineConfig, {devTools})
      .onTransition((state, event) => ADD_LOGS && logTransition(state, event, workflowId))
      .onDone(() => (this.workflows = this.workflows.filter(w => w.id !== workflowId)))
      .start();
    // TODO: Figure out how to resolve rendering priorities
    this.renderUI(service);

    const workflow = {id: workflowId, service, domain: 'TODO'};
    this.workflows.push(workflow);
    return workflow;
  }

  private renderUI(machine) {
    if (document.getElementById('root')) {
      ReactDOM.render(
        React.createElement(WalletUi, {workflow: machine}),
        document.getElementById('root')
      );
    }
  }

  public async pushMessage(jsonRpcMessage: object, fromDomain: string) {
    // Update any workflows waiting on an observable
    await this.messagingService.receiveRequest(jsonRpcMessage, fromDomain);
  }

  public onSendMessage(
    callback: (jsonRpcMessage: Notification | Response | ErrorResponse) => void
  ) {
    this.messagingService.outboxFeed.subscribe(m => callback(m));
  }
}

const alreadyLogging = {};
const key = (v, id) => `${JSON.stringify(v)}-${id}`;

const transitionLogger = logger.child({module: 'wallet'});
const log = transitionLogger.trace.bind(transitionLogger);

export function logTransition(state: State<any, any, any, any>, event, id?: string): void {
  const k = key(state.value, id);
  if (alreadyLogging[k]) return;
  alreadyLogging[k] = true;

  const eventType = event.type ? event.type : event;
  const {context, value: to} = state;
  if (!state.history) {
    log(
      {id, workflow: state.configuration[0].id, to, context, event},
      'WORKFLOW STARTED id %s event %s',
      id,
      eventType
    );
  } else {
    const from = state.history.value;

    log({id, from, to, context, event}, 'WORKFLOW TRANSITION id %s event %o', id, event.type);
  }

  Object.keys(state.children).forEach(k => {
    const child = state.children[k];

    if (child.state && 'onTransition' in child) {
      const subId = (child as any).state.configuration[0].id;
      (child as any).onTransition((state, event) => logTransition(state, event, `${id}/${subId}`));
    }
  });
}
