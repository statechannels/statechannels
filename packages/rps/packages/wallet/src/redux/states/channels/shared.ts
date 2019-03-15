import { Commitment } from 'fmg-core';

export interface SharedChannelState {
  address: string;
  privateKey: string;
}

export const CHANNEL_INITIALIZED = 'CHANNEL.INITIALIZED';

export interface SignedCommitment {
  commitment: Commitment;
  signature: string;
}

export interface FirstCommitmentReceived extends SharedChannelState {
  channelId: string;
  libraryAddress: string;
  ourIndex: number;
  participants: [string, string];
  channelNonce: number;
  turnNum: number;
  lastCommitment: SignedCommitment;
  requestedTotalFunds: string;
  requestedYourDeposit: string;
}
export interface ChannelOpen extends FirstCommitmentReceived {
  penultimateCommitment: SignedCommitment;
}
export interface ChannelOpenAndTransactionExists extends ChannelOpen {
  transactionHash: string;
}
export interface TransactionExists {
  transactionHash: string;
}
export interface ChallengeExists extends ChannelOpen {
  challengeExpiry?: number;
}

export interface UserAddressExists extends ChannelOpen {
  userAddress: string;
}

// creators
export function baseChannelState<T extends SharedChannelState>(params: T): SharedChannelState {
  const { address, privateKey } = params;
  return {
    address,
    privateKey,
  };
}

export function firstCommitmentReceived<T extends FirstCommitmentReceived>(
  params: T,
): FirstCommitmentReceived {
  const {
    channelId,
    ourIndex,
    participants,
    channelNonce,
    turnNum,
    lastCommitment: lastPosition,
    libraryAddress,
    requestedTotalFunds,
    requestedYourDeposit,
  } = params;
  return {
    ...baseChannelState(params),
    channelId,
    ourIndex,
    participants,
    channelNonce,
    turnNum,
    lastCommitment: lastPosition,
    libraryAddress,
    requestedTotalFunds,
    requestedYourDeposit,
  };
}

export function channelOpen<T extends ChannelOpen>(params: T): ChannelOpen {
  return {
    ...firstCommitmentReceived(params),
    penultimateCommitment: params.penultimateCommitment,
  };
}

export function challengeExists<T extends ChallengeExists>(params: T): ChallengeExists {
  return {
    ...channelOpen(params),
    challengeExpiry: params.challengeExpiry,
  };
}

export function userAddressExists<T extends UserAddressExists>(params: T): UserAddressExists {
  return {
    ...challengeExists(params),
    userAddress: params.userAddress,
  };
}
