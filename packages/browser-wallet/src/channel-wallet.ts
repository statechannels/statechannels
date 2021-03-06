import {interpret, State} from 'xstate';
import {Guid} from 'guid-typescript';
import {
  StateChannelsNotification,
  StateChannelsResponse,
  StateChannelsErrorResponse
} from '@statechannels/client-api-schema';
import {filter, take} from 'rxjs/operators';
import {
  Payload,
  isOpenChannel,
  OpenChannel,
  Address,
  DirectFunder,
  makeAddress,
  RichObjectiveEvent,
  RichObjective
} from '@statechannels/wallet-core';
import _ from 'lodash';

import {TriggerObjectiveEvent, UpdateUI, Workflow} from './channel-wallet-types';
import {serializeChannelEntry} from './utils/wallet-core-v0.8.0';
import {AppRequestEvent} from './event-types';
import {Store} from './store';
import {ApproveBudgetAndFund, CloseLedgerAndWithdraw, Application} from './workflows';
import {ethereumEnableWorkflow} from './workflows/ethereum-enable';
import {
  MessagingService,
  MessagingServiceInterface,
  supportedFundingStrategyOrThrow
} from './messaging';
import {ADD_LOGS, WALLET_VERSION} from './config';
import {logger} from './logger';
import {ChainWatcher} from './chain';

export class ChannelWallet {
  public workflows: Workflow[];
  /**
   *
   * @param chainAddress Ethereum address for the wallet
   * @param updateUI Callback that will be invoked when the channel wallet wants to update UI
   * @param setTriggerObjectiveEvent The invoker of the create API might wish to send objective events to the wallet. The wallet
   *  calls setTriggerObjectiveEvent to hand back the invoker the callback to use for objective events.
   * @returns
   */
  static async create(
    chainAddress?: Address,
    updateUI?: UpdateUI,
    setTriggerObjectiveEvent?: (callback: TriggerObjectiveEvent) => void
  ): Promise<ChannelWallet> {
    const chain = new ChainWatcher(chainAddress);
    const store = new Store(chain);
    await store.initialize();
    const wallet = new ChannelWallet(
      store,
      new MessagingService(store),
      updateUI,
      setTriggerObjectiveEvent
    );
    return wallet;
  }

  constructor(
    private store: Store,
    private messagingService: MessagingServiceInterface,
    protected updateUI?: UpdateUI,
    setTriggerObjectiveEvent?: (callback: TriggerObjectiveEvent) => void
  ) {
    setTriggerObjectiveEvent?.(_.bind(this.crankRichObjective, this));
    this.workflows = [];

    // Whenever the store wants to send something call sendMessage
    store.outboxFeed.subscribe(async (m: Payload) => {
      this.messagingService.sendMessageNotification(m);
    });

    store.richObjectiveEventFeed.subscribe(_.bind(this.crankRichObjective, this));

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
        const fundingStrategy = supportedFundingStrategyOrThrow(objective.data.fundingStrategy);
        // Note that it's important to start the workflow first, before sending ChannelProposed.
        // This way, the workflow is listening to JOIN_CHANNEL right from the get go.
        this.startWorkflow(
          Application.workflow(this.store, this.messagingService, {
            type: 'JOIN_CHANNEL',
            fundingStrategy,
            channelId: objective.data.targetChannelId,
            applicationDomain: 'TODO' // FIXME
          }),
          this.calculateWorkflowId(objective)
        );

        this.messagingService.sendChannelNotification('ChannelProposed', {
          ...serializeChannelEntry(channelEntry)
        });
      }
    });

    this.store.richObjectiveFeed.subscribe(objective => this.updateUI?.({objective}));
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
        // This is wallet 1.0 logic. Leaving for now for reference.
        /** 
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
        */

        // This wallet 2.0 logic
        this.store.createAndStoreOpenChannelObjective({
          ...request,
          appDefinition: makeAddress(request.appDefinition)
        });
        break;
      }
      case 'JOIN_CHANNEL':
        // This is wallet 1.0 logic. Leaving for now for reference.
        // this.getWorkflow(this.calculateWorkflowId(request)).service.send(request);

        // This wallet 2.0 logic
        this.approveRichObjective(request.channelId);
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

    this.updateUI?.({service});

    const workflow = {id: workflowId, service, domain: 'TODO'};
    this.workflows.push(workflow);
    return workflow;
  }

  public onSendMessage(
    callback: (
      jsonRpcMessage: StateChannelsNotification | StateChannelsResponse | StateChannelsErrorResponse
    ) => void
  ) {
    this.messagingService.outboxFeed.subscribe(m => callback(m));
  }

  public getAddress(): Promise<string> {
    return this.store.getAddress();
  }

  public async pushMessage(jsonRpcMessage: object, fromDomain: string) {
    // Update any workflows waiting on an observable
    await this.messagingService.receiveRequest(jsonRpcMessage, fromDomain);
  }

  /**
   *  START of wallet 2.0
   */

  private async crankRichObjective(event: RichObjectiveEvent): Promise<void> {
    // TODO: this should invoke a store method
    const richObjective = this.store.richObjectives[event.channelId];
    if (!richObjective) {
      throw new Error(`Unable to map event ${JSON.stringify(event)} to an objective`);
    }
    const channelId = richObjective.channelId;
    const result = DirectFunder.openChannelCranker(
      richObjective,
      event,
      await this.store.getPrivateKey(await this.store.getAddress())
    );

    this.store.richObjectives[channelId] = result.objective;

    for (const action of result.actions) {
      switch (action.type) {
        case 'sendStates':
          await Promise.all(action.states.map(state => this.store.addState(state, true)));
          break;
        case 'deposit':
          const fundingMilestones = DirectFunder.utils.fundingMilestone(
            richObjective.openingState,
            richObjective.openingState.participants[richObjective.myIndex].destination
          );

          const txHash = await this.store.chain.deposit(
            channelId,
            fundingMilestones.targetBefore,
            action.amount
          );
          this.crankRichObjective({
            channelId: channelId,
            type: 'DepositSubmitted',
            tx: txHash ?? '',
            attempt: 0,
            submittedAt: Date.now()
          });

          break;
        default:
          throw new Error('Not expected to reach here');
      }

      this.updateUI?.({objective: this.store.richObjectives[channelId]});

      // TODO: we might want to first crank the objective, gather all states that need to be sent, and then send
      // both the objective and the new states
      if (event.type === 'Approval') this.sendObjective(this.store.richObjectives[channelId]);
    }
  }

  private async sendObjective(richObjective: RichObjective) {
    // TODO: need a better way to figure out when to broadcast an objective
    //        since we don't know here if we are the creator of the objective or received the objective from elsewhere
    const amCreator = richObjective.myIndex === 0;
    if (amCreator) {
      // TODO: generalize to other objectives
      const objectiveToSend: OpenChannel = {
        type: 'OpenChannel',
        participants: richObjective.openingState.participants,
        data: {targetChannelId: richObjective.channelId, fundingStrategy: 'Direct'}
      };

      await this.messagingService.sendMessageNotification({
        walletVersion: WALLET_VERSION,
        objectives: [objectiveToSend]
      });
    }
  }

  public async approveRichObjective(channelId: string): Promise<void> {
    // TODO: it seems that an objective event should have an objective id or a channel id associated with the event
    this.crankRichObjective({type: 'Approval', channelId: channelId});
  }

  public getRichObjectives() {
    return this.store.richObjectives;
  }

  /**
   * Only used for testing
   */
  public destroy(): void {
    this.store.chain.destroy();
  }

  /**
   *  END of wallet 2.0
   */
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

  // TODO: this is commented out with the upgrade to xstate@4.17.1 since child.state property does not exist
  // Object.keys(state.children).forEach(k => {
  //   const child = state.children[k];

  //   if (child.state && 'onTransition' in child) {
  //     const subId = (child as any).state.configuration[0].id;
  //     (child as any).onTransition((state, event) => logTransition(state, event, `${id}/${subId}`));
  //   }
  // });
}
