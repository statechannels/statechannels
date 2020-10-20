import {BN, isSimpleAllocation, checkThat, State} from '@statechannels/wallet-core';
import _ from 'lodash';

import {Protocol, ProtocolResult, ChannelState, stage, Stage} from './state';
import {
  signState,
  noAction,
  fundChannel as requestFundChannel,
  FundChannel,
  requestLedgerFunding as requestLedgerFundingAction,
  completeObjective,
  CompleteObjective,
  RequestLedgerFunding,
  OpenChannelProtocolAction,
  SignState,
} from './actions';

export type ProtocolState = {
  app: ChannelState;
  ledgerFundingRequested?: boolean;
  fundingChannel?: ChannelState;
};

const stageGuard = (guardStage: Stage) => (s: State | undefined): s is State =>
  !!s && stage(s) === guardStage;

type SupportedChannelState = ChannelState & Required<Pick<ChannelState, 'supported'>>;

const isPrefundSetup = stageGuard('PrefundSetup');

// These are currently unused, but will be used
// const isRunning = stageGuard('Running');
const isPostfundSetup = stageGuard('PostfundSetup');
const isRunning = stageGuard('Running');
// const isMissing = (s: State | undefined): s is undefined => stage(s) === 'Missing';

function isFunded({
  app: {channelId, funding, supported, fundingStrategy},
  fundingChannel,
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
      if (!fundingChannel) return false;
      if (!fundingChannel.supported) return false;
      // if (!isFunded({app: fundingChannel})) return false; // TODO: Should we check this?
      const {allocationItems} = checkThat(fundingChannel.supported.outcome, isSimpleAllocation);
      return _.find(allocationItems, ({destination}) => destination === channelId) !== undefined;
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

const requestFundChannelIfMyTurn = ({
  supported,
  chainServiceRequests,
  channelId,
  myIndex,
  participants,
  funding,
}: SupportedChannelState): FundChannel | false => {
  // Don't submit another chain service request if one already exists
  if (chainServiceRequests.indexOf('fund') > -1) return false;

  // Wallet only supports single-asset (i.e., "simple") allocations
  const {allocationItems, assetHolderAddress} = checkThat(supported.outcome, isSimpleAllocation);

  // Some accessors for use with later guards
  const currentFunding = funding(assetHolderAddress);
  const myDestination = participants[myIndex].destination;
  const allocationsBeforeMe = _.takeWhile(
    allocationItems,
    ({destination}) => destination !== myDestination
  );
  const myAllocationItem = _.find(
    allocationItems,
    ({destination}) => destination === myDestination
  );

  if (!myAllocationItem) return false;

  const targetFundingBeforeDeposit = allocationsBeforeMe
    .map(({amount}) => amount)
    .reduce(BN.add, BN.from(0));

  // Don't continue if counterparty hasn't fully funded their part yet
  if (BN.lt(currentFunding, targetFundingBeforeDeposit)) return false;

  // Don't continue if my funding expectation is zero
  if (BN.eq(myAllocationItem.amount, 0)) return false;

  return requestFundChannel({
    channelId,
    assetHolderAddress,
    expectedHeld: currentFunding,
    amount: myAllocationItem.amount,
  });
};

const requestLedgerFunding = ({
  channelId,
  supported,
}: SupportedChannelState): RequestLedgerFunding | false => {
  const {assetHolderAddress} = checkThat(supported.outcome, isSimpleAllocation);
  return requestLedgerFundingAction({
    channelId,
    assetHolderAddress,
  });
};

const isDirectlyFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Direct';
const isLedgerFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Ledger';
const isSupported = (app: ChannelState): app is SupportedChannelState => !!app.support;

const fundChannel = ({
  app,
  ledgerFundingRequested,
}: ProtocolState): RequestLedgerFunding | FundChannel | false =>
  isPrefundSetup(app.supported) &&
  isPrefundSetup(app.latestSignedByMe) &&
  isSupported(app) &&
  ((isDirectlyFunded(app) && requestFundChannelIfMyTurn(app)) ||
    (isLedgerFunded(app) && !ledgerFundingRequested && requestLedgerFunding(app)));

const signPostFundSetup = (ps: ProtocolState): SignState | false =>
  myTurnToPostfund(ps) &&
  isFunded(ps) &&
  !!ps.app.latestSignedByMe &&
  isSupported(ps.app) &&
  signState({
    ...ps.app.latestSignedByMe,
    channelId: ps.app.channelId,
    turnNum: myPostfundTurnNumber(ps),
  });

const completeOpenChannel = (ps: ProtocolState): CompleteObjective | false =>
  (isRunning(ps.app.supported) || isPostfundSetup(ps.app.supported)) &&
  completeObjective({channelId: ps.app.channelId});

export const protocol: Protocol<ProtocolState> = (
  ps: ProtocolState
): ProtocolResult<OpenChannelProtocolAction> =>
  signPostFundSetup(ps) || fundChannel(ps) || completeOpenChannel(ps) || noAction;
