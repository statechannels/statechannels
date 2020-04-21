import {Store} from './store';
import {MessagingServiceInterface} from './messaging';

import ReactDOM from 'react-dom';
import React from 'react';
import {Wallet as WalletUi} from './ui/wallet';
import {interpret, Interpreter, State} from 'xstate';
import {Guid} from 'guid-typescript';
import {Notification, Response} from '@statechannels/client-api-schema';
import {filter, take} from 'rxjs/operators';
import {Message, isOpenChannel, OpenChannel} from './store/types';

import {ApproveBudgetAndFund, CloseLedgerAndWithdraw, Application} from './workflows';
import {ethereumEnableWorkflow} from './workflows/ethereum-enable';
import {AppRequestEvent} from './event-types';
import {serializeChannelEntry} from './serde/app-messages/serialize';
import {ADD_LOGS, IS_PRODUCTION} from './constants';
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

      // Note that it's important to start the workflow first, before sending ChannelProposed.
      // This way, the workflow is listening to JOIN_CHANNEL right from the get go.
      this.startWorkflow(
        Application.workflow(this.store, this.messagingService, {
          type: 'JOIN_CHANNEL',
          fundingStrategy: objective.data.fundingStrategy,
          channelId: objective.data.targetChannelId,
          applicationSite: 'TODO' // FIXME
        }),
        this.calculateWorkflowId(objective)
      );

      this.messagingService.sendChannelNotification('ChannelProposed', {
        ...(await serializeChannelEntry(channelEntry)),
        fundingStrategy: objective.data.fundingStrategy
      });
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
          console.warn(
            `There is already a workflow running with id ${workflowId}, no new workflow will be spawned`
          );
        }
        break;
      }
      case 'JOIN_CHANNEL':
        this.getWorkflow(this.calculateWorkflowId(request)).service.send(request);
        break;
      case 'APPROVE_BUDGET_AND_FUND': {
        this.startWorkflow(
          ApproveBudgetAndFund.machine(this.store, this.messagingService, {
            player: request.player,
            hub: request.hub,
            budget: request.budget,
            requestId: request.requestId
          }),
          workflowId,
          true // devtools
        );

        break;
      }
      case 'CLOSE_AND_WITHDRAW': {
        this.startWorkflow(
          CloseLedgerAndWithdraw.workflow(this.store, this.messagingService, {
            opponent: request.hub,
            player: request.player,
            requestId: request.requestId,
            site: request.site
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
  private startWorkflow(machine: any, workflowId: string, devTools = false): Workflow {
    if (this.isWorkflowIdInUse(workflowId)) {
      throw new Error(`There is already a workflow running with id ${workflowId}`);
    }
    const service = interpret(machine, {devTools})
      .onTransition((state, event) => ADD_LOGS && logTransition(state, event, workflowId))
      .onTransition(
        async () =>
          IS_PRODUCTION &&
          logger.info({workflowId, store: await this.store.dumpBackend()}, 'Done workflow')
      )
      .onDone(() => (this.workflows = this.workflows.filter(w => w.id !== workflowId)))
      .onStop(
        () =>
          service.state.value === 'done' ||
          logger.error('Service finished prematurely in %s', service.state.value)
      )
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

  public async pushMessage(jsonRpcMessage, fromDomain) {
    // Update any workflows waiting on an observable
    await this.messagingService.receiveRequest(jsonRpcMessage, fromDomain);
  }

  public onSendMessage(callback: (jsonRpcMessage: Notification | Response) => void) {
    this.messagingService.outboxFeed.subscribe(m => callback(m));
  }
}

export function logTransition(state: State<any, any, any, any>, event, id?: string): void {
  const to = state.value;
  if (!state.history) {
    logger.info('%s - STARTED %o TRANSITIONED TO %o', id, state.configuration[0].id, to);
  } else {
    const from = state.history.value;
    const eventType = event.type ? event.type : event;

    logger.info('%s - TRANSITION FROM %o EVENT %s TO %o', id, from, eventType, to);
  }
  Object.keys(state.children).forEach(k => {
    const child = state.children[k];

    if (child.state && 'onTransition' in child) {
      const subId = (child as any).state.configuration[0].id;
      (child as any).onTransition((state, event) => logTransition(state, event, `${id}/${subId}`));
    }
  });
}
