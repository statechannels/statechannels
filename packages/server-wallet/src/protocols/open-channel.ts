import {BN, isSimpleAllocation, checkThat, State} from '@statechannels/wallet-core';
import _ from 'lodash';
import {Transaction} from 'knex';

import {Store} from '../wallet/store';
import {Bytes32} from '../type-aliases';

import {Protocol, ProtocolResult, ChannelState, stage, Stage} from './state';
import {
  signState,
  noAction,
  fundChannel as requestFundChannel,
  FundChannel,
  requestLedgerFunding as requestLedgerFundingAction,
  RequestLedgerFunding,
  completeObjective,
  CompleteObjective,
} from './actions';

export type ProtocolState = {
  app: ChannelState;
  ledgerFundingRequested?: boolean;
  ledger?: ChannelState;
};

const stageGuard = (guardStage: Stage) => (s: State | undefined): s is State =>
  !!s && stage(s) === guardStage;

const isPrefundSetup = stageGuard('PrefundSetup');

// These are currently unused, but will be used
// const isRunning = stageGuard('Running');
// const isPostfundSetup = stageGuard('PostfundSetup');
const isRunning = stageGuard('Running');
// const isMissing = (s: State | undefined): s is undefined => stage(s) === 'Missing';

function isFunded({
  app: {channelId, funding, supported, fundingStrategy},
  ledger,
}: ProtocolState): boolean {
  switch (fundingStrategy) {
    case 'Unfunded':
      return true;

    case 'Direct': {
      if (!supported) return false;
      const allocation = checkThat(supported?.outcome, isSimpleAllocation);
      const currentFunding = funding(allocation.assetHolderAddress);
      const targetFunding = allocation.allocationItems
        .map(a => a.amount)
        .reduce(BN.add, BN.from(0));
      const funded = BN.gte(currentFunding, targetFunding) ? true : false;
      return funded;
    }

    case 'Ledger': {
      if (!ledger) return false;
      if (!ledger.supported) return false;
      // if (!isFunded({app: fundingChannel})) return false; // TODO: Should we check this?
      const {allocationItems} = checkThat(ledger.supported.outcome, isSimpleAllocation);
      return _.some(allocationItems, ({destination}) => destination === channelId);
    }

    default:
      throw new Error('isFunded: Undeterminable... unimplemented funding strategy');
  }
}

// At the time of implementation, all particiapants sign turn 0 as prefund state
// This function should also work with prefund state with increasing turn numbers.
function myTurnToPostfund({app}: ProtocolState): boolean {
  // I am the first participant
  if (isPrefundSetup(app.supported) && isPrefundSetup(app.latestSignedByMe) && app.myIndex === 0) {
    return true;
  }

  // I am NOT the first participant
  // todo: this is not correct when there are more than 2 participants as we do not check that EVERY participant
  //  before us has signed the postfund state.
  //  A correct implementation is non-trivial when all participants sign turn 0 prefund states but increasing turn number postfund states.
  return app.latest?.turnNum === myPostfundTurnNumber({app}) - 1;
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
  const currentFunding = app.funding(assetHolderAddress);
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

const isUnfunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Unfunded';
const isDirectlyFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Direct';
const isLedgerFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Ledger';

const fundChannel = (ps: ProtocolState): ProtocolResult | false =>
  isPrefundSetup(ps.app.supported) &&
  isPrefundSetup(ps.app.latestSignedByMe) &&
  ((isDirectlyFunded(ps.app) && requestFundChannelIfMyTurn(ps)) ||
    (isLedgerFunded(ps.app) && !ps.ledgerFundingRequested && requestLedgerFunding(ps)));

const signPreFundSetup = (ps: ProtocolState): ProtocolResult | false =>
  !ps.app.latestSignedByMe &&
  !!ps.app.latest &&
  ps.app.latest.turnNum < ps.app.participants.length - 1 &&
  signState({
    ...ps.app.latest,
    channelId: ps.app.channelId,
    turnNum: ps.app.myIndex,
  });

const signPostFundSetup = (ps: ProtocolState): ProtocolResult | false =>
  myTurnToPostfund(ps) &&
  (isFunded(ps) || isUnfunded(ps.app)) &&
  ps.app.latestSignedByMe &&
  ps.app.supported &&
  signState({
    ...ps.app.latestSignedByMe,
    channelId: ps.app.channelId,
    turnNum: myPostfundTurnNumber(ps),
  });

const completeOpenChannel = (ps: ProtocolState): CompleteObjective | false =>
  (ps.app.supported?.turnNum === ps.app.participants.length * 2 - 1 ||
    isRunning(ps.app.supported)) &&
  completeObjective({channelId: ps.app.channelId});

export const protocol: Protocol<ProtocolState> = (ps: ProtocolState): ProtocolResult =>
  signPreFundSetup(ps) ||
  signPostFundSetup(ps) ||
  fundChannel(ps) ||
  completeOpenChannel(ps) ||
  noAction;

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
    case 'Unfunded':
      return {app};
    case 'Ledger': {
      const req = await store.getLedgerRequest(app.channelId, 'fund', tx);
      return {
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
