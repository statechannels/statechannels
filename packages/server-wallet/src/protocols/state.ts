import {
  SignedStateWithHash,
  serializeAllocation,
  checkThat,
  isAllocation,
  Participant,
  Address,
  Destination,
} from '@statechannels/wallet-core';
import {ChannelResult, ChannelStatus, FundingStrategy} from '@statechannels/client-api-schema';

import {Bytes32, Uint256} from '../type-aliases';

import {ProtocolAction} from './actions';

export type ChainServiceApi = 'fund' | 'withdraw' | 'challenge';
/**
 * TODO: This should be a dictionary instead of a list.
 * The values of this dictionary should represent the parameter with which the api is called.
 * - fund: the value is the asset holder address
 * - withdraw: might not need a value?
 * - challenge: the value is the state with which challenge is called.
 */
export type ChainServiceRequests = ChainServiceApi[];
export type ChannelStateFunding = {
  amount: Uint256;
  transferredOut: {toAddress: Destination; amount: Uint256}[];
};

/*
The ChannelState type is the data that protocols need about a given channel to decide what to do next.
*/
export type ChannelState = {
  channelId: string;
  myIndex: 0 | 1;
  participants: Participant[];
  support?: SignedStateWithHash[];
  supported?: SignedStateWithHash;
  latest: SignedStateWithHash;
  latestSignedByMe?: SignedStateWithHash;
  latestNotSignedByMe?: SignedStateWithHash;
  funding: (address: Address) => ChannelStateFunding;
  chainServiceRequests: ChainServiceRequests;
  fundingStrategy: FundingStrategy;
  fundingLedgerChannelId?: Bytes32; // only present if funding strategy is Ledger
};

type WithSupported = {supported: SignedStateWithHash};
type SignedByMe = {latestSignedByMe: SignedStateWithHash};

export type ChannelStateWithMe = ChannelState & SignedByMe;
export type ChannelStateWithSupported = ChannelState & SignedByMe & WithSupported;

/**
 * The definition of a ChannelStatus is still under debate, but for now
 * this is what we have settled on. Future changes should include 'funding',
 * 'defunding', and state related to challenging, probably. See this issue
 * for more: https://github.com/statechannels/statechannels/issues/2509
 */
export const status = (channelState: ChannelState): ChannelStatus => {
  const {supported, latest, latestSignedByMe, support} = channelState;
  const {participants} = supported ?? latest;
  if (latest.isFinal) {
    if (support?.every(s => s.isFinal)) {
      return 'closed'; // the entire support chain isFinal
    } else {
      return 'closing'; // at least one isFinal state proposed
    }
  } else {
    if (latest.turnNum >= participants.length * 2) {
      return 'running'; // unambiguously running e.g., 4, 5, 6, ...
    } else {
      if (latest.turnNum < participants.length) {
        if (latestSignedByMe) {
          return 'opening'; // 0 or 1 signed by me
        } else {
          return 'proposed'; // 0 or 1 signed, but not by me
        }
      } else {
        if (support?.every(s => s.turnNum >= participants.length)) {
          return 'running'; // <-- e.g., 2 and 3 both signed
        } else {
          return 'opening'; // <-- debatebly this could be 'funding'
        }
      }
    }
  }
};

export const toChannelResult = (channelState: ChannelState): ChannelResult => {
  const {channelId, supported, latest} = channelState;
  const {outcome, appData, turnNum, participants, appDefinition} = supported ?? latest;
  return {
    appData,
    appDefinition,
    channelId,
    participants,
    turnNum,
    allocations: serializeAllocation(checkThat(outcome, isAllocation)),
    status: status(channelState),
  };
};

/*
A protocol should accept a "protocol state", and return or resolve to
- either zero or one protocol actions;
- or, a protocol error
A protocol should never reject or throw.
*/
export type ProtocolResult<A extends ProtocolAction = ProtocolAction> = A | undefined;
export type Protocol<PS> = (ps: PS) => ProtocolResult;
