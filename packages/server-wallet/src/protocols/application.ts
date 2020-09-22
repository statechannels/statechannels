import {BN, isSimpleAllocation, checkThat, State} from '@statechannels/wallet-core';
import _ from 'lodash';

import {Protocol, ProtocolResult, ChannelState, stage, Stage} from './state';
import {signState, noAction, fundChannel as requestFundChannel, FundChannel} from './actions';

export type ProtocolState = {app: ChannelState};

const stageGuard = (guardStage: Stage) => (s: State | undefined): s is State =>
  !!s && stage(s) === guardStage;

const isPrefundSetup = stageGuard('PrefundSetup');
// These are currently unused, but will be used
// const isPostfundSetup = stageGuard('PostfundSetup');
// const isRunning = stageGuard('Running');
const isFinal = stageGuard('Final');
// const isMissing = (s: State | undefined): s is undefined => stage(s) === 'Missing';

const isFunded = ({app: {funding, supported}}: ProtocolState): boolean => {
  if (!supported) return false;
  const {allocationItems, assetHolderAddress} = checkThat(supported.outcome, isSimpleAllocation);
  const currentFunding = funding(assetHolderAddress);
  const targetFunding = allocationItems.map(({amount}) => amount).reduce(BN.add, BN.from(0));
  return BN.gte(currentFunding, targetFunding);
};

/**
 * The below logic assumes:
 *  1. Each destination occurs at most once.
 *  2. We only care about a single destination.
 * One reason to drop (2), for instance, is to support ledger top-ups with as few state updates as possible.
 */
const requestFundChannelIfMyTurn = ({
  app: {supported, chainServiceRequests, channelId, myIndex, participants, funding},
}: ProtocolState): FundChannel | false => {
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

const isDirectlyFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Direct';

// todo: the only cases considered so far are directly funded
const fundChannel = (ps: ProtocolState): ProtocolResult | false =>
  isPrefundSetup(ps.app.supported) &&
  isPrefundSetup(ps.app.latestSignedByMe) &&
  isDirectlyFunded(ps.app) &&
  requestFundChannelIfMyTurn(ps);

const signPostFundSetup = (ps: ProtocolState): ProtocolResult | false =>
  isPrefundSetup(ps.app.supported) &&
  isPrefundSetup(ps.app.latestSignedByMe) &&
  isFunded(ps) &&
  signState({channelId: ps.app.channelId, ...ps.app.latestSignedByMe, turnNum: 3});

const signFinalState = (ps: ProtocolState): ProtocolResult | false =>
  isFinal(ps.app.supported) &&
  !isFinal(ps.app.latestSignedByMe) &&
  signState({channelId: ps.app.channelId, ...ps.app.supported});

export const protocol: Protocol<ProtocolState> = (ps: ProtocolState): ProtocolResult =>
  signPostFundSetup(ps) || fundChannel(ps) || signFinalState(ps) || noAction;
