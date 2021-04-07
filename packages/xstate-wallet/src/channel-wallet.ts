import {interpret, Interpreter, State} from 'xstate';
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
  SignedState,
  Uint256,
  BN,
  checkThat,
  isSimpleEthAllocation,
  Zero,
  SharedObjective,
  Address
} from '@statechannels/wallet-core';
import {Dictionary} from '@statechannels/wallet-core/node_modules/@types/lodash';
import ReactDOM from 'react-dom';
import React from 'react';

import {serializeChannelEntry} from './utils/wallet-core-v0.8.0';
import {ChannelStoreEntry} from './store/channel-store-entry';
import {AppRequestEvent} from './event-types';
import {Store} from './store';
import {ApproveBudgetAndFund, CloseLedgerAndWithdraw, Application} from './workflows';
import {ethereumEnableWorkflow} from './workflows/ethereum-enable';
import {
  MessagingService,
  MessagingServiceInterface,
  supportedFundingStrategyOrThrow
} from './messaging';
import {ADD_LOGS} from './config';
import {logger} from './logger';
import {ChainWatcher, ChannelChainInfo} from './chain';
import {Wallet as WalletUi} from './ui/wallet';

export interface Workflow {
  id: string;
  service: Interpreter<any, any, any>;
  domain: string; // TODO: Is this useful?
}

export type Message = {
  objectives: SharedObjective[];
  signedStates: SignedState[];
};
type Response = Message & {deposit?: boolean};
type Funding = {amountOnChain: Uint256; status?: 'DEPOSITED'};
type DepositInfo = {
  depositAt: Uint256;
  myDeposit: Uint256;
  totalAfterDeposit: Uint256;
  fundedAt: Uint256;
};
export class ChannelWallet {
  public workflows: Workflow[];
  protected channelFunding: Dictionary<Funding> = {};
  protected registeredChannels: Set<string> = new Set<string>();
  static async create(chainAddress?: Address): Promise<ChannelWallet> {
    const chain = new ChainWatcher(chainAddress);
    const store = new Store(chain);
    await store.initialize();
    return new ChannelWallet(store, new MessagingService(store));
  }

  constructor(
    private store: Store,
    private messagingService: MessagingServiceInterface,
    public id?: string
  ) {
    this.workflows = [];

    // Whenever the store wants to send something call sendMessage
    store.outboxFeed.subscribe(async (m: Payload) => {
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

  /**
   *  START of wallet 2.0
   */

  public async pushMessage(jsonRpcMessage: object, fromDomain: string) {
    // Update any workflows waiting on an observable
    await this.messagingService.receiveRequest(jsonRpcMessage, fromDomain);

    let response: Message = {
      objectives: [],
      signedStates: []
    };

    // Crank objectives
    for (const objective of this.store.objectives) {
      switch (objective.type) {
        case 'OpenChannel': {
          response = await this.onOpenChannelObjective(objective.data.targetChannelId);
          break;
        }
        default:
          throw new Error('Objective not supported');
      }
    }
    return response;
  }

  async onOpenChannelObjective(channelId: string): Promise<Message> {
    const channel = await this.store.getEntry(channelId);
    if (!this.registeredChannels.has(channelId)) {
      this.store.chain.chainUpdatedFeed(channelId).subscribe({
        next: chainInfo => this.onFundingUpdate(channelId, chainInfo)
      });
      this.registeredChannels.add(channelId);
    }
    const pk = await this.store.getPrivateKey(await this.store.getAddress());
    const depositInfo = await this.getDepositInfo(channelId);

    const response = this.crankOpenChannelObjective(
      channel,
      this.channelFunding[channelId] ?? {amountOnChain: '0x0'},
      depositInfo,
      pk
    );
    if (response.deposit) {
      this.channelFunding[channelId] = {...this.channelFunding[channelId], status: 'DEPOSITED'};
      await this.store.chain.deposit(
        channel.channelId,
        this.channelFunding[channelId].amountOnChain,
        depositInfo.myDeposit
      );
    }
    if (response.signedStates[0]) {
      await this.store.addState(response.signedStates[0]);
      this.messagingService.sendMessageNotification({
        ...response,
        walletVersion: '@statechannels/server-wallet@1.23.0)'
      });
    }
    return response;
  }

  crankOpenChannelObjective(
    channel: ChannelStoreEntry,
    channelFunding: Funding,
    depositInfo: DepositInfo,
    pk: string
  ): Response {
    const response: Response = {
      objectives: [],
      signedStates: []
    };
    const {latestState} = channel;
    // Should we sign the prefund state?
    if (latestState.turnNum === 0 && !channel.isSupportedByMe) {
      const newState = channel.signAndAdd(latestState, pk);
      response.signedStates = [newState];
      return response;
    }

    // Should we deposit?
    if (
      BN.gte(channelFunding.amountOnChain, depositInfo.depositAt) &&
      BN.lt(channelFunding.amountOnChain, depositInfo.totalAfterDeposit) &&
      channelFunding.status !== 'DEPOSITED'
    ) {
      response.deposit = true;
      return response;
    }

    // Should we sign the postfund state?
    if (
      BN.gte(channelFunding.amountOnChain, depositInfo.fundedAt) &&
      latestState.turnNum === 3 &&
      channel.latestSignedByMe.turnNum === 0
    ) {
      const newState = channel.signAndAdd(latestState, pk);
      response.signedStates = [newState];
      return response;
    }

    return response;
  }

  async onFundingUpdate(channelId: string, channelChainInfo: ChannelChainInfo): Promise<void> {
    this.channelFunding[channelId] = {
      ...this.channelFunding[channelId],
      amountOnChain: channelChainInfo.amount
    };
    await this.onOpenChannelObjective(channelId);
  }

  async getDepositInfo(channelId: string): Promise<DepositInfo> {
    const {latestState, myIndex} = await this.store.getEntry(channelId);
    const {allocationItems} = checkThat(latestState.outcome, isSimpleEthAllocation);

    const fundedAt = allocationItems.map(a => a.amount).reduce(BN.add);
    let depositAt = Zero;
    for (let i = 0; i < allocationItems.length; i++) {
      const {amount} = allocationItems[i];
      if (i !== myIndex) depositAt = BN.add(depositAt, amount);
      else {
        const totalAfterDeposit = BN.add(depositAt, amount);
        return {depositAt, myDeposit: amount, totalAfterDeposit, fundedAt};
      }
    }

    throw Error(`Could not find an allocation for participant id ${myIndex}`);
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

  Object.keys(state.children).forEach(k => {
    const child = state.children[k];

    if (child.state && 'onTransition' in child) {
      const subId = (child as any).state.configuration[0].id;
      (child as any).onTransition((state, event) => logTransition(state, event, `${id}/${subId}`));
    }
  });
}
