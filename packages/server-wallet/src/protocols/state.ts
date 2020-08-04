import {Either} from 'fp-ts/lib/Either';
import {Option} from 'fp-ts/lib/Option';
import {
  SignedStateWithHash,
  serializeAllocation,
  checkThat,
  isAllocation,
  State,
} from '@statechannels/wallet-core';
import {ChannelResult} from '@statechannels/client-api-schema';

import {Address, Uint256} from '../type-aliases';

import {ProtocolAction} from './actions';

/*
The ChannelState type is the data that protocols need about a given channel to decide what to do next.
*/
export type ChannelState = {
  channelId: string;
  myIndex: 0 | 1;
  supported?: SignedStateWithHash;
  latest: SignedStateWithHash;
  latestSignedByMe?: SignedStateWithHash;
  funding: (address: Address) => Uint256;
};
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

// FIXME: This should be a union of the errors that the client-api-schema specifies.
export type ProtocolError = Error;

export const toChannelResult = (channelState: ChannelState): ChannelResult => {
  const {channelId, supported} = channelState;

  const {outcome, appData, turnNum, participants, appDefinition} = supported || channelState.latest;

  return {
    appData,
    appDefinition,
    channelId,
    participants,
    turnNum,
    allocations: serializeAllocation(checkThat(outcome, isAllocation)),
    status: channelState.supported ? 'funding' : 'opening', // FIXME
  };
};

/*
A protocol should accept a "protocol state", and return or resolve to
- either zero or one protocol actions;
- or, a protocol error
A protocol should never reject or throw.
*/
export type ProtocolResult = Either<ProtocolError, Option<ProtocolAction>>;
export type Protocol<PS> = (ps: PS) => ProtocolResult | Promise<ProtocolResult>;
