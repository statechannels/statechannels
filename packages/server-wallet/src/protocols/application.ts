import {BN, isSimpleAllocation, checkThat, State} from '@statechannels/wallet-core';

import {Protocol, ProtocolResult, ChannelState, stage, Stage} from './state';
import {signStateProtocolResult, noAction} from './actions';

export type ProtocolState = {app: ChannelState};

const stageGuard = (guardStage: Stage) => (s: State | undefined): s is State =>
  !!s && stage(s) === guardStage;

const isPrefundSetup = stageGuard('PrefundSetup');
// These are currently unused, but will be used
// const isPostfundSetup = stageGuard('PostfundSetup');
// const isRunning = stageGuard('Running');
// const isFinal = stageGuard('Final');
// const isMissing = (s: State | undefined): s is undefined => stage(s) === 'Missing';

const isFunded = ({app: {funding, supported}}: ProtocolState): boolean => {
  if (!supported) return false;

  const allocation = checkThat(supported?.outcome, isSimpleAllocation);

  const currentFunding = funding(allocation.assetHolderAddress);
  const targetFunding = allocation.allocationItems.map(a => a.amount).reduce(BN.add, BN.from(0));
  return BN.gte(currentFunding, targetFunding) ? true : false;
};

const signPostFundSetup = (ps: ProtocolState): ProtocolResult | undefined => {
  const {
    app: {supported, latestSignedByMe, channelId},
  } = ps;

  if (isPrefundSetup(supported) && isPrefundSetup(latestSignedByMe) && isFunded(ps))
    return signStateProtocolResult({channelId, ...latestSignedByMe, turnNum: 3});
  else return;
};

export const protocol: Protocol<ProtocolState> = (ps: ProtocolState): ProtocolResult => {
  return signPostFundSetup(ps) || noAction;
};
