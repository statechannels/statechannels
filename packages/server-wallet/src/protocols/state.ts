import {
  SignedStateWithHash,
  serializeAllocation,
  checkThat,
  isAllocation,
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
import {ChainServiceRequest} from '../models/chain-service-request';
import {AdjudicatorStatus} from '../models/adjudicator-status';

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
  funding: (address: Address) => ChannelStateFunding | undefined;
  chainServiceRequests: ChainServiceRequest[];
  fundingStrategy: FundingStrategy;
  fundingLedgerChannelId?: Bytes32; // only present if funding strategy is Ledger
  directFundingStatus?: FundingStatus;
  adjudicatorStatus: AdjudicatorStatus['channelMode'];
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
  const {participants} = latest;

  if (!supported) {
    if (!latestSignedByMe) return 'proposed';
    return 'opening';
  }

  if (supported.isFinal) {
    if (_.every(support, 'isFinal')) return 'closed';
    return 'closing';
  }

  if (supported.turnNum < 2 * participants.length - 1) return 'opening';

  return 'running';
};

export const toChannelResult = (channelState: ChannelState): ChannelResult => {
  const {channelId, supported, latest, directFundingStatus, adjudicatorStatus} = channelState;

  const {outcome, appData, turnNum, participants, appDefinition} = supported ?? latest;
  return {
    appData,
    appDefinition,
    channelId,
    participants,
    turnNum,
    allocations: serializeAllocation(checkThat(outcome, isAllocation)),
    status: status(channelState),
    fundingStatus: directFundingStatus,
    adjudicatorStatus,
  };
};

/* 
Note that this function does not take into consideration state turn numbers. Do not rely
on ReadyToFund status as the sole criteria for determining if a channel is ready to be funded
*/
export function directFundingStatus(
  supported: SignedStateVarsWithHash | undefined,
  fundingFn: (address: Address) => ChannelStateFunding | undefined,
  myParticipant: Participant,
  fundingStrategy: FundingStrategy
): FundingStatus | undefined {
  if (fundingStrategy === 'Fake') {
    if (!supported) return 'Uncategorized';
    if (supported.turnNum < 3) return 'ReadyToFund';
    return 'Funded';
  }

  if (fundingStrategy !== 'Direct') {
    return 'Uncategorized';
  }

  const outcome = supported?.outcome;
  if (!supported || !outcome) {
    return 'Uncategorized';
  }

  const {allocationItems, assetHolderAddress} = checkThat(outcome, isSimpleAllocation);

  // Collapse all allocation items with my destination into one
  const myDestination = myParticipant.destination;
  const myAmount = allocationItems
    .filter(ai => ai.destination === myDestination)
    .map(ai => ai.amount)
    .reduce(BN.add, BN.from(0));

  const funding = fundingFn(assetHolderAddress);
  if (!funding) return undefined;

  const amountTransferredToMe = funding.transferredOut
    .filter(tf => tf.toAddress === myDestination)
    .map(ai => ai.amount)
    .reduce(BN.add, BN.from(0));
  const amountTransferredToAll = funding.transferredOut
    .map(ai => ai.amount)
    .reduce(BN.add, BN.from(0));

  // Note that following case:
  // - The total amount allocated to me are zero
  // - Only one final state is signed, and that state is supported.
  // This channel is categorized as Defunded even though all final states might not be signed yet.
  if (supported.isFinal && BN.gte(amountTransferredToMe, myAmount)) {
    return 'Defunded';
  }

  const fullFunding = allocationItems.map(a => a.amount).reduce(BN.add, BN.from(0));
  if (BN.eq(amountTransferredToMe, 0) && BN.gte(funding.amount, fullFunding)) {
    return 'Funded';
  }

  const myAllocationIndex = _.findIndex(allocationItems, ai => ai.destination === myDestination);
  const allocationsBeforeMe = allocationItems.slice(0, myAllocationIndex);
  const allocationsWithMe = allocationItems.slice(0, myAllocationIndex + 1);
  const fundingBeforeMe = allocationsBeforeMe.map(a => a.amount).reduce(BN.add, BN.from(0));
  const fundingWithMe = allocationsWithMe.map(a => a.amount).reduce(BN.add, BN.from(0));

  if (
    BN.eq(amountTransferredToAll, 0) &&
    BN.gte(funding.amount, fundingBeforeMe) &&
    BN.lt(funding.amount, fundingWithMe)
  ) {
    return 'ReadyToFund';
  }

  return 'Uncategorized';
}
