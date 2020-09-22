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

  const allocation = checkThat(supported?.outcome, isSimpleAllocation);

  const currentFunding = funding(allocation.assetHolderAddress);

  const targetFunding = allocation.allocationItems.map(a => a.amount).reduce(BN.add, BN.from(0));
  const funded = BN.gte(currentFunding, targetFunding) ? true : false;

  return funded;
};

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
  return requestFundChannel({
    channelId: app.channelId,
    assetHolderAddress: assetHolderAddress,
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
