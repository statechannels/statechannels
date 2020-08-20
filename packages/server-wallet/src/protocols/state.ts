import {ChannelStatus} from '@statechannels/client-api-schema';
import {
  SignedStateWithHash,
  serializeAllocation,
  checkThat,
  isAllocation,
  State,
} from '@statechannels/wallet-core';

import {Address, Uint256} from '../type-aliases';
import {ChannelResult} from '../wallet';

import {ProtocolAction} from './actions';

export type Funding = Record<Address, Uint256 | undefined>;
/*
The ChannelState type is the data that protocols need about a given channel to decide what to do next.
*/
export type ChannelState = {
  channelId: string;
  myIndex: 0 | 1;
  support?: SignedStateWithHash[];
  supported?: SignedStateWithHash;
  latest: SignedStateWithHash;
  latestSignedByMe?: SignedStateWithHash;
  funding: Funding;
};

type WithSupported = {supported: SignedStateWithHash};
type SignedByMe = {latestSignedByMe: SignedStateWithHash};

export type ChannelStateWithMe = ChannelState & SignedByMe;
export type ChannelStateWithSupported = ChannelState & SignedByMe & WithSupported;

export type Stage = 'Missing' | 'PrefundSetup' | 'PostfundSetup' | 'Running' | 'Final';
/**
 *
 * @param state: SignedStateWithHash | undefined
 * Returns stage of state.
 *
 * Useful for partitioning the protocol state to decide what action to next take.
 */
export const stage = (state: State | undefined): Stage =>
  !state
    ? 'Missing'
    : state.isFinal
    ? 'Final'
    : state.turnNum === 0
    ? 'PrefundSetup'
    : state.turnNum === 3
    ? 'PostfundSetup'
    : 'Running';

export const toChannelResult = (channelState: ChannelState): ChannelResult => {
  const {channelId, supported, latest, latestSignedByMe, support, funding} = channelState;

  const {outcome, appData, turnNum, participants, appDefinition} = supported ?? latest;

  const status: ChannelStatus = ((): ChannelStatus => {
    switch (stage(supported)) {
      case 'Missing':
      case 'PrefundSetup':
        return latestSignedByMe ? 'opening' : 'proposed';
      case 'PostfundSetup':
      case 'Running':
        return 'running';
      case 'Final':
        return support?.find(s => !s.isFinal) ? 'closing' : 'closed';
    }
  })();

  const allocations = serializeAllocation(checkThat(outcome, isAllocation));

  return {appData, appDefinition, channelId, participants, turnNum, allocations, status, funding};
};

/*
A protocol should accept a "protocol state", and return or resolve to
- either zero or one protocol actions;
- or, a protocol error
A protocol should never reject or throw.
*/
export type ProtocolResult<A extends ProtocolAction = ProtocolAction> = A | undefined;
export type Protocol<PS> = (ps: PS) => ProtocolResult;
