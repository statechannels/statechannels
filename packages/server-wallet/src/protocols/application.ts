import {BN, isSimpleAllocation, checkThat, State} from '@statechannels/wallet-core';
import _ from 'lodash';

import {Protocol, ProtocolResult, ChannelState, stage, Stage} from './state';
import {signState, noAction, submitTransaction} from './actions';

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

const myTurnToFund = ({app}: ProtocolState): boolean => {
  if (!app.supported) return false;
  if (app.chainServiceRequests.indexOf('fund') > -1) return false;

  const myDestination = app.participants[app.myIndex].destination;
  const allocation = checkThat(app.supported?.outcome, isSimpleAllocation);
  const currentFunding = app.funding(allocation.assetHolderAddress);
  const allocationsBeforeMe = _.takeWhile(
    allocation.allocationItems,
    a => a.destination !== myDestination
  );
  const targetFunding = allocationsBeforeMe.map(a => a.amount).reduce(BN.add, BN.from(0));
  return BN.gte(currentFunding, targetFunding);
};

const isDirectlyFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Direct';

// todo: the only cases considered so far are directly funded and unfunded channels
const fundChannel = (ps: ProtocolState): ProtocolResult | false =>
  isPrefundSetup(ps.app.supported) &&
  isPrefundSetup(ps.app.latestSignedByMe) &&
  myTurnToFund(ps) &&
  isDirectlyFunded(ps.app) &&
  submitTransaction({channelId: ps.app.channelId, transactionRequest: {}, transactionId: ''});

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
