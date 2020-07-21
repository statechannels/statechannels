import {SignedStateVarsWithHash, SignedStateWithHash} from '@statechannels/wallet-core';

import {Channel} from '../models/channel';
import {ParticipantId} from '../type-aliases';

import {ProtocolAction} from './actions';

type ProtocolState = {
  channelId: string;
  myIndex: 0 | 1;
  peer: ParticipantId;
  // turn number == 0 <==> prefund setup
  // turn number == 3 <==> postfund setup
  // turn number > 3 <=> channel is set up
  supported: SignedStateWithHash;
  latest: SignedStateWithHash;
  latestSignedByMe: SignedStateWithHash;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function protocolState(appChannel: Channel): ProtocolState {
  const {channelId, myIndex, participants, supported, latest, latestSignedByMe} = appChannel;
  const peer = participants[1 - myIndex].participantId;

  return {
    myIndex: myIndex as 0 | 1,
    peer,
    channelId,
    supported,
    latest,
    latestSignedByMe,
  };
}
type Stage = 'Missing' | 'PrefundSetup' | 'PostfundSetup' | 'Running' | 'Final';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const stage = (state: SignedStateVarsWithHash | undefined): {type: Stage} => ({
  type: !state
    ? 'Missing'
    : state.isFinal
    ? 'Final'
    : state.turnNum === 0
    ? 'PrefundSetup'
    : state.turnNum === 3
    ? 'PostfundSetup'
    : 'Running',
});

// The machine can be used something like this:
export async function executionLoop(_c: Channel): Promise<ProtocolAction[]> {
  return [];
}
