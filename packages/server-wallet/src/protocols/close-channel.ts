import {State} from '@statechannels/wallet-core';

import {Protocol, ProtocolResult, ChannelState, stage, Stage} from './state';
import {signState, noAction, CompleteObjective, completeObjective, Withdraw} from './actions';

export type ProtocolState = {app: ChannelState};

const stageGuard = (guardStage: Stage) => (s: State | undefined): s is State =>
  !!s && stage(s) === guardStage;

const isFinal = stageGuard('Final');

function everyoneSignedFinalState(ps: ProtocolState): boolean {
  return (ps.app.support || []).every(isFinal) && isFinal(ps.app.latestSignedByMe);
}

const signFinalState = (ps: ProtocolState): ProtocolResult | false =>
  !!ps.app.supported &&
  !isFinal(ps.app.latestSignedByMe) &&
  signState({
    channelId: ps.app.channelId,
    ...ps.app.supported,
    turnNum: ps.app.supported.turnNum + (isFinal(ps.app.supported) ? 0 : 1),
    isFinal: true,
  });

const completeCloseChannel = (ps: ProtocolState): CompleteObjective | false =>
  everyoneSignedFinalState(ps) && completeObjective({channelId: ps.app.channelId});

function withdraw(ps: ProtocolState): Withdraw | false {
  return (
    everyoneSignedFinalState(ps) &&
    ps.app.fundingStrategy === 'Direct' &&
    ps.app.chainServiceRequests.indexOf('withdraw') === -1 &&
    withdraw(ps)
  );
}

export const protocol: Protocol<ProtocolState> = (ps: ProtocolState): ProtocolResult =>
  completeCloseChannel(ps) || signFinalState(ps) || withdraw(ps) || noAction;
