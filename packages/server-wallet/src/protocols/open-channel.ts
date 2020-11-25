import {Logger} from 'pino';
import {BN, isSimpleAllocation, checkThat, State, unreachable} from '@statechannels/wallet-core';
import _ from 'lodash';
import {Transaction} from 'knex';

import {Store} from '../wallet/store';
import {Bytes32} from '../type-aliases';
import {DBOpenChannelObjective} from '../models/objective';
import {WalletResponse} from '../wallet/response-builder';
import {recordFunctionMetrics} from '../metrics';
import {Channel} from '../models/channel';
import {ChainServiceInterface} from '../chain-service';
import {LedgerRequest} from '../models/ledger-request';

import {ChannelState, stage, Stage} from './state';
import {
  signState,
  noAction,
  fundChannel as requestFundChannel,
  FundChannel,
  requestLedgerFunding as requestLedgerFundingAction,
  RequestLedgerFunding,
  completeObjective,
  CompleteObjective,
  SignState,
} from './actions';

export class ChannelOpener {
  constructor(
    private store: Store,
    private chainService: ChainServiceInterface,
    private logger: Logger,
    private timingMetrics = false
  ) {}

  public static create(
    store: Store,
    chainService: ChainServiceInterface,
    logger: Logger,
    timingMetrics = false
  ): ChannelOpener {
    return new ChannelOpener(store, chainService, logger, timingMetrics);
  }

  public async crank(objective: DBOpenChannelObjective, response: WalletResponse): Promise<void> {
    const channelToLock = objective.data.targetChannelId;

    let attemptAnotherProtocolStep = true;

    while (attemptAnotherProtocolStep) {
      await this.store.lockApp(channelToLock, async tx => {
        const protocolState = await getOpenChannelProtocolState(
          this.store,
          objective.data.targetChannelId,
          tx
        );
        const nextAction = recordFunctionMetrics(protocol(protocolState), this.timingMetrics);

        if (nextAction) {
          try {
            switch (nextAction.type) {
              case 'SignState':
                await this.signState(nextAction, protocolState, tx, response);
                break;
              case 'FundChannel':
                await this.fundChannel(nextAction, tx);
                break;
              case 'CompleteObjective':
                attemptAnotherProtocolStep = false;
                await this.completeObjective(objective, protocolState, tx, response);
                break;
              case 'RequestLedgerFunding':
                await this.requestLedgerFunding(protocolState, tx);
                break;
              default:
                unreachable(nextAction);
            }
          } catch (error) {
            this.logger.error({error}, 'Error handling action');
            await tx.rollback(error);
            attemptAnotherProtocolStep = false;
          }
        } else {
          response.queueChannelState(protocolState.app);
          attemptAnotherProtocolStep = false;
        }
      });
    }
  }

  private async signState(
    action: SignState,
    protocolState: ProtocolState,
    tx: Transaction,
    response: WalletResponse
  ): Promise<void> {
    const {myIndex, channelId} = protocolState.app;
    const channel = await Channel.forId(channelId, tx);
    const signedState = await this.store.signState(channel, action, tx);
    response.queueState(signedState, myIndex, channelId);
  }

  private async fundChannel(action: FundChannel, tx: Transaction): Promise<void> {
    await this.store.addChainServiceRequest(action.channelId, 'fund', tx);
    // Note, we are not awaiting transaction submission
    this.chainService.fundChannel({
      ...action,
      expectedHeld: BN.from(action.expectedHeld),
      amount: BN.from(action.amount),
    });
  }

  private async completeObjective(
    objective: DBOpenChannelObjective,
    protocolState: ProtocolState,
    tx: Transaction,
    response: WalletResponse
  ): Promise<void> {
    await this.store.markObjectiveAsSucceeded(objective, tx);

    response.queueChannelState(protocolState.app);
    response.queueSucceededObjective(objective);
  }

  private async requestLedgerFunding(protocolState: ProtocolState, tx: Transaction): Promise<void> {
    await LedgerRequest.requestLedgerFunding(
      protocolState.app.channelId,
      protocolState.app.fundingLedgerChannelId as string,
      tx
    );
  }
}

type OpenChannelProtocolResult =
  | FundChannel
  | SignState
  | CompleteObjective
  | RequestLedgerFunding
  | undefined;

export const protocol = (ps: ProtocolState): OpenChannelProtocolResult =>
  signPreFundSetup(ps) ||
  signPostFundSetup(ps) ||
  fundChannel(ps) ||
  completeOpenChannel(ps) ||
  noAction;

export type AppState = {
  app: ChannelState;
};

export type DirectlyFundedAppState = AppState & {
  type: 'DirectFundingProtocolState';
};

export type LedgerFundedAppState = AppState & {
  type: 'LedgerFundingProtocolState';
  ledgerFundingRequested: boolean;
  ledger: ChannelState | undefined;
};

export type ProtocolState = DirectlyFundedAppState | LedgerFundedAppState;

const stageGuard = (guardStage: Stage) => (s: State | undefined): s is State =>
  !!s && stage(s) === guardStage;

const isPrefundSetup = stageGuard('PrefundSetup');

// These are currently unused, but will be used
// const isRunning = stageGuard('Running');
// const isPostfundSetup = stageGuard('PostfundSetup');
const isRunning = stageGuard('Running');
// const isMissing = (s: State | undefined): s is undefined => stage(s) === 'Missing';

function ledgerFundedThisChannel(ledger: ChannelState, app: ChannelState): boolean {
  if (!ledger.supported) return false;
  if (!app.supported) return false;

  const {allocationItems: ledgerFunding} = checkThat(ledger.supported.outcome, isSimpleAllocation);
  const {allocationItems: appFunding} = checkThat(app.supported.outcome, isSimpleAllocation);
  const targetFunding = appFunding.map(a => a.amount).reduce(BN.add, BN.from(0));

  return _.some(
    ledgerFunding,
    ({destination, amount}) => destination === app.channelId && amount === targetFunding
  );
}

function isFunded(ps: ProtocolState): boolean {
  const {funding, supported, fundingStrategy} = ps.app;

  switch (fundingStrategy) {
    case 'Fake':
      return true;

    case 'Direct': {
      if (!supported) return false;
      const allocation = checkThat(supported?.outcome, isSimpleAllocation);
      const currentFunding = funding(allocation.assetHolderAddress).amount;
      const targetFunding = allocation.allocationItems
        .map(a => a.amount)
        .reduce(BN.add, BN.from(0));
      const funded = BN.gte(currentFunding, targetFunding) ? true : false;
      return funded;
    }

    case 'Ledger': {
      if (ps.type !== 'LedgerFundingProtocolState') return false;
      if (!ps.ledger) return false;
      // TODO: in the future check "funding table"
      if (!isFunded({type: 'DirectFundingProtocolState', app: ps.ledger})) return false;
      return ledgerFundedThisChannel(ps.ledger, ps.app);
    }

    default:
      throw new Error('isFunded: Undeterminable... unimplemented funding strategy');
  }
}

function myPostfundTurnNumber({app}: ProtocolState): number {
  return app.participants.length + app.myIndex;
}

const requestFundChannelIfMyTurn = ({app}: ProtocolState): FundChannel | false => {
  if (!app.supported) return false;
  if (app.chainServiceRequests.indexOf('fund') > -1) return false;

  const myDestination = app.participants[app.myIndex].destination;
  const {allocationItems, assetHolderAddress} = checkThat(
    app.supported?.outcome,
    isSimpleAllocation
  );

  /**
   * The below logic assumes:
   *  1. Each destination occurs at most once.
   *  2. We only care about a single destination.
   * One reason to drop (2), for instance, is to support ledger top-ups with as few state updates as possible.
   */
  const currentFunding = app.funding(assetHolderAddress).amount;
  const allocationsBeforeMe = _.takeWhile(allocationItems, a => a.destination !== myDestination);
  const targetFunding = allocationsBeforeMe.map(a => a.amount).reduce(BN.add, BN.from(0));
  if (BN.lt(currentFunding, targetFunding)) return false;

  const myAllocationItem = _.find(allocationItems, ai => ai.destination === myDestination);
  if (!myAllocationItem) {
    throw new Error(`My destination ${myDestination} is not in allocations ${allocationItems}`);
  }
  if (BN.eq(myAllocationItem.amount, 0)) return false;

  return requestFundChannel({
    channelId: app.channelId,
    assetHolderAddress: assetHolderAddress,
    expectedHeld: currentFunding,
    amount: myAllocationItem.amount,
  });
};

const requestLedgerFunding = ({app}: ProtocolState): RequestLedgerFunding | false => {
  if (!app.supported) return false;
  const {assetHolderAddress} = checkThat(app.supported.outcome, isSimpleAllocation);
  return requestLedgerFundingAction({
    channelId: app.channelId,
    assetHolderAddress,
  });
};

const isFakeFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Fake';
const isDirectlyFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Direct';
const isLedgerFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Ledger';

const fundDirectly = (ps: ProtocolState): FundChannel | false => {
  return (
    ps.type === 'DirectFundingProtocolState' &&
    isDirectlyFunded(ps.app) &&
    requestFundChannelIfMyTurn(ps)
  );
};

const fundViaLedger = (ps: ProtocolState): RequestLedgerFunding | false => {
  return (
    ps.type === 'LedgerFundingProtocolState' &&
    isLedgerFunded(ps.app) &&
    !ps.ledgerFundingRequested &&
    requestLedgerFunding(ps)
  );
};

const fundChannel = (ps: ProtocolState): OpenChannelProtocolResult | false =>
  isPrefundSetup(ps.app.supported) &&
  isPrefundSetup(ps.app.latestSignedByMe) &&
  (fundDirectly(ps) || fundViaLedger(ps));

const signPreFundSetup = (ps: ProtocolState): SignState | false =>
  !ps.app.latestSignedByMe &&
  !!ps.app.latest &&
  ps.app.latest.turnNum < ps.app.participants.length &&
  signState({
    ...ps.app.latest,
    channelId: ps.app.channelId,
    turnNum: ps.app.myIndex,
  });

const signPostFundSetup = (ps: ProtocolState): SignState | undefined | false =>
  ps.app.supported &&
  ps.app.latestSignedByMe &&
  ps.app.latestSignedByMe.turnNum < ps.app.participants.length &&
  (isFunded(ps) || isFakeFunded(ps.app)) &&
  signState({
    ...ps.app.latestSignedByMe,
    channelId: ps.app.channelId,
    turnNum: myPostfundTurnNumber(ps),
  });

const completeOpenChannel = (ps: ProtocolState): CompleteObjective | false =>
  (ps.app.supported?.turnNum === ps.app.participants.length * 2 - 1 ||
    isRunning(ps.app.supported)) &&
  completeObjective({channelId: ps.app.channelId});

/**
 * Helper method to retrieve scoped data needed for OpenChannel protocol.
 */
export const getOpenChannelProtocolState = async (
  store: Store,
  channelId: Bytes32,
  tx: Transaction
): Promise<ProtocolState> => {
  const app = await store.getChannel(channelId, tx);
  switch (app.fundingStrategy) {
    case 'Direct':
    case 'Fake':
      return {type: 'DirectFundingProtocolState', app};
    case 'Ledger': {
      const req = await store.getLedgerRequest(app.channelId, 'fund', tx);
      return {
        type: 'LedgerFundingProtocolState',
        app,
        ledgerFundingRequested: !!req,
        ledger: req ? await store.getChannel(req.ledgerChannelId, tx) : undefined,
      };
    }
    case 'Unknown':
    case 'Virtual':
    default:
      throw new Error('getOpenChannelProtocolState: Unimplemented funding strategy');
  }
};
