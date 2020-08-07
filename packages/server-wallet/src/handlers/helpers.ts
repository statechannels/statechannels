import {StateVariables} from '@statechannels/wallet-core';

import {ChannelState, ChannelStateWithSupported, ChannelStateWithMe} from '../protocols/state';

export const hasStateSignedByMe = (cs: ChannelState): cs is ChannelStateWithMe =>
  !!cs.latestSignedByMe;
export const hasSupportedState = (cs: ChannelState): cs is ChannelStateWithSupported =>
  !!cs.supported;
export const isMyTurn = (cs: ChannelStateWithSupported): boolean =>
  (cs.supported.turnNum + 1) % cs.supported.participants.length === cs.myIndex;

export const latest = (cs: ChannelState): StateVariables => cs.latest;
export const supported = (cs: ChannelStateWithSupported): StateVariables => cs.supported;
export const latestSignedByMe = (cs: ChannelStateWithMe): StateVariables => cs.latestSignedByMe;
