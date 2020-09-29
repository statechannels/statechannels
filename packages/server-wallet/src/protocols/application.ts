import {BN, isSimpleAllocation, checkThat, State} from '@statechannels/wallet-core';
import _ from 'lodash';

import {Protocol, ProtocolResult, ChannelState, stage, Stage, stageGuard} from './state';
import {
  signState,
  noAction,
  fundChannel as requestFundChannel,
  FundChannel,
  RequestLedgerFunding,
  requestLedgerFunding as requestLedgerFundingAction,
  SignState,
} from './actions';

export type ProtocolState = {
  app: ChannelState;
  fundingChannel?: ChannelState;
};

const isPrefundSetup = stageGuard('PrefundSetup');

// These are currently unused, but will be used
// const isPostfundSetup = stageGuard('PostfundSetup');
// const isRunning = stageGuard('Running');

const isFinal = stageGuard('Final');
// const isMissing = (s: State | undefined): s is undefined => stage(s) === 'Missing';

const isFunded = ({
  app: {channelId, funding, supported, fundingStrategy},
  fundingChannel,
}: ProtocolState): boolean => {
  if (!supported) return false;
  switch (fundingStrategy) {
    case 'Direct': {
      const {allocationItems, assetHolderAddress} = checkThat(
        supported.outcome,
        isSimpleAllocation
      );
      const currentFunding = funding(assetHolderAddress);
      const targetFunding = allocationItems.map(({amount}) => amount).reduce(BN.add, BN.from(0));
      return BN.gte(currentFunding, targetFunding);
    }
    case 'Ledger': {
      if (!fundingChannel) return false;
      if (!fundingChannel.supported) return false;
      if (!isFunded({app: fundingChannel})) return false; // TODO: Should we check this?
      const {allocationItems} = checkThat(fundingChannel.supported.outcome, isSimpleAllocation);
      return _.find(allocationItems, ({destination}) => destination === channelId) !== undefined;
    }
    default:
      throw new Error('Unimplemented');
  }
};

/**
 * The below logic assumes:
 *  1. Each destination occurs at most once.
 *  2. We only care about a single destination.
 * One reason to drop (2), for instance, is to support ledger top-ups with as few state updates as possible.
 */
const requestFundChannelIfMyTurn = ({
  supported,
  chainServiceRequests,
  channelId,
  myIndex,
  participants,
  funding,
}: ChannelState): FundChannel | false => {
  // Sanity-check (should have been checked by prior application protocol guard)
  if (!supported) return false;

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

  // Sanity-check (should never happen if wallet code is correct; does not join unrelated channels)
  if (!myAllocationItem)
    throw new Error(`My destination ${myDestination} is not in allocations ${allocationItems}`);

  const targetFundingBeforeDeposit = allocationsBeforeMe
    .map(({amount}) => amount)
    .reduce(BN.add, BN.from(0));

  // Don't continue if counterparty hasn't fully funded their part yet
  if (BN.lt(currentFunding, targetFundingBeforeDeposit)) return false;

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
  ledgerFundingRequested,
}: ChannelState): RequestLedgerFunding | false => {
  if (!supported) return false;

  // Don't submit another ledger funding request if one already exists
  if (ledgerFundingRequested) return false;

  const {assetHolderAddress} = checkThat(supported.outcome, isSimpleAllocation);

  return requestLedgerFundingAction({
    channelId,
    assetHolderAddress,
  });
};

const isDirectlyFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Direct';
const isLedgerFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Ledger';

const fundChannel = ({
  app,
}: ProtocolState): SignState | FundChannel | RequestLedgerFunding | false =>
  isPrefundSetup(app.supported) &&
  isPrefundSetup(app.latestSignedByMe) &&
  ((isDirectlyFunded(app) && requestFundChannelIfMyTurn(app)) ||
    (isLedgerFunded(app) && requestLedgerFunding(app)));

const signPostFundSetup = (ps: ProtocolState): SignState | false =>
  isPrefundSetup(ps.app.supported) &&
  isPrefundSetup(ps.app.latestSignedByMe) &&
  isFunded(ps) &&
  signState({channelId: ps.app.channelId, ...ps.app.latestSignedByMe, turnNum: 3});

const signFinalState = (ps: ProtocolState): SignState | false =>
  isFinal(ps.app.supported) &&
  !isFinal(ps.app.latestSignedByMe) &&
  signState({channelId: ps.app.channelId, ...ps.app.supported});

export const protocol: Protocol<ProtocolState> = (ps: ProtocolState): ProtocolResult =>
  signPostFundSetup(ps) || fundChannel(ps) || signFinalState(ps) || noAction;
