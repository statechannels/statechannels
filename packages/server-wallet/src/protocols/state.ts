import {
  SignedStateWithHash,
  serializeAllocation,
  checkThat,
  isAllocation,
  State,
  Participant,
  Address,
  Destination,
  SignedStateVarsWithHash,
  isSimpleAllocation,
  BN,
} from '@statechannels/wallet-core';
import {
  ChannelResult,
  ChannelStatus,
  FundingStatus,
  FundingStrategy,
} from '@statechannels/client-api-schema';
import _ from 'lodash';

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
  directFundingStatus: FundingStatus;
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
    : state.turnNum <= state.participants.length - 1
    ? 'PrefundSetup'
    : state.turnNum <= state.participants.length * 2 - 1
    ? 'PostfundSetup'
    : 'Running';

export const toChannelResult = (channelState: ChannelState): ChannelResult => {
  const {
    channelId,
    supported,
    latest,
    latestSignedByMe,
    support,
    directFundingStatus,
  } = channelState;

  const {outcome, appData, turnNum, participants, appDefinition} = supported ?? latest;

  const status: ChannelStatus = ((): ChannelStatus => {
    switch (stage(supported)) {
      case 'Missing':
      case 'PrefundSetup':
        return latestSignedByMe ? 'opening' : 'proposed';
      case 'PostfundSetup':
        return (supported?.turnNum || 0) < participants.length * 2 - 1 ? 'opening' : 'running';
      case 'Running':
        return 'running';
      case 'Final':
        return support?.find(s => !s.isFinal) ? 'closing' : 'closed';
    }
  })();

  const allocations = serializeAllocation(checkThat(outcome, isAllocation));

  return {
    appData,
    appDefinition,
    channelId,
    participants,
    turnNum,
    allocations,
    status,
    fundingStatus: directFundingStatus,
  };
};

export function directFundingStatus(
  supported: SignedStateVarsWithHash | undefined,
  fundingFn: (address: Address) => ChannelStateFunding,
  myParticipant: Participant,
  fundingStrategy: FundingStrategy
): FundingStatus {
  if (fundingStrategy !== 'Direct') {
    return 'Uncategorized';
  }

  const outcome = supported?.outcome;
  if (!supported || !outcome) {
    return 'Uncategorized';
  }

  const {allocationItems, assetHolderAddress} = checkThat(outcome, isSimpleAllocation);

  // Collapse all allocation items with my destination into one
  const myAllocation = allocationItems
    .filter(ai => ai.destination === myParticipant.destination)
    .reduce(
      (soFar, currentAi) => ({
        ...soFar,
        amount: BN.add(soFar.amount, currentAi.amount),
      }),
      {
        destination: myParticipant.destination,
        amount: BN.from(0),
      }
    );

  const funding = fundingFn(assetHolderAddress);

  const amountTransferredToMe = funding.transferredOut
    .filter(tf => tf.toAddress === myAllocation.destination)
    .reduce((soFar, currentAi) => BN.add(soFar, currentAi.amount), BN.from(0));
  // Note that following case:
  // - The total amount allocated to me are zero
  // - Only one final state is signed, and that state is supported.
  // This channel is categorized as Defunded even though all final states might not be signed yet.
  if (supported.isFinal && BN.gte(amountTransferredToMe, myAllocation.amount)) {
    return 'Defunded';
  }

  const fullFunding = allocationItems.map(a => a.amount).reduce(BN.add, BN.from(0));
  if (BN.eq(amountTransferredToMe, 0) && BN.gte(funding.amount, fullFunding)) {
    return 'Funded';
  }

  const allocationsBeforeMe = _.takeWhile(
    allocationItems,
    a => a.destination !== myAllocation.destination
  );
  const fundingBeforeMe = allocationsBeforeMe.map(a => a.amount).reduce(BN.add, BN.from(0));
  if (BN.eq(amountTransferredToMe, 0) && BN.gte(funding.amount, fundingBeforeMe)) {
    return 'ReadyToFund';
  }

  return 'Uncategorized';
}

/*
A protocol should accept a "protocol state", and return or resolve to
- either zero or one protocol actions;
- or, a protocol error
A protocol should never reject or throw.
*/
export type ProtocolResult<A extends ProtocolAction = ProtocolAction> = A | undefined;
export type Protocol<PS> = (ps: PS) => ProtocolResult;
