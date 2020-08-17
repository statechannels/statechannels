import {BN, isSimpleAllocation, checkThat, State} from '@statechannels/wallet-core';

import {Protocol, ProtocolResult, ChannelState, stage, Stage} from './state';
import {signState, noAction} from './actions';

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
  // todo: remove this hardcoding. Tracked by https://github.com/statechannels/the-graph/issues/80
  // This hardcoding is in place due to:
  // - https://github.com/statechannels/the-graph/issues/74 needs to be implemented.
  // - Once the api above is implemented, it should be called by the application, the chain watcher, or maybe even another wallet.
  return true || funded;
};

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
  signPostFundSetup(ps) || signFinalState(ps) || noAction;
