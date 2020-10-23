import {State} from '@statechannels/wallet-core';

import {Protocol, ProtocolResult, ChannelState, stage, Stage} from './state';
import {signState, noAction, CompleteObjective, completeObjective, SignState} from './actions';

export type ProtocolState = {app: ChannelState};

const stageGuard = (guardStage: Stage) => (s: State | undefined): s is State =>
  !!s && stage(s) === guardStage;

const isFinal = stageGuard('Final');

const signFinalState = (ps: ProtocolState): SignState | false =>
  !!ps.app.supported &&
  !!ps.app.latestSignedByMe &&
  !ps.app.latestSignedByMe?.isFinal &&
  signState({
    ...ps.app.supported,
    channelId: ps.app.channelId,
    isFinal: true,
    turnNum: ps.app.supported.isFinal
      ? ps.app.latestSignedByMe.turnNum + ps.app.participants.length
      : ps.app.supported.turnNum + 1,
  });

const completeCloseChannel = (ps: ProtocolState): CompleteObjective | false =>
  (ps.app.support || []).every(isFinal) &&
  isFinal(ps.app.latestSignedByMe) &&
  completeObjective({channelId: ps.app.channelId});

export const protocol: Protocol<ProtocolState> = (ps: ProtocolState): ProtocolResult =>
  completeCloseChannel(ps) || signFinalState(ps) || noAction;
