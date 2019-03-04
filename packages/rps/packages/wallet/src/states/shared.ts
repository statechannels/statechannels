import { TransactionRequest } from "ethers/providers";
import { WalletEvent, DisplayAction } from 'magmo-wallet-client';
import { Action } from 'redux';
import { Commitment } from 'fmg-core';

export interface Base {
  displayOutbox?: DisplayAction;
  messageOutbox?: WalletEvent;
  transactionOutbox?: TransactionRequest;
}

export interface LoggedIn extends Base {
  uid: string;
}

export interface AddressExists extends LoggedIn {
  address: string;
  privateKey: string;
  networkId: number;
  adjudicator: string;
}

export interface SignedCommitment {
  commitment: Commitment;
  signature: string;
}

export interface FirstMoveSent extends AddressExists {
  channelId: string;
  libraryAddress: string;
  ourIndex: number;
  participants: [string, string];
  channelNonce: number;
  turnNum: number;
  lastCommitment: SignedCommitment;
  unhandledAction?: Action;
  requestedTotalFunds: string;
  requestedYourDeposit: string;
}
export interface ChannelOpen extends FirstMoveSent {
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
export function base<T extends Base>(params: T): Base {
  const { messageOutbox, transactionOutbox, displayOutbox, } = params;
  return { messageOutbox, transactionOutbox, displayOutbox };
}

export function loggedIn<T extends LoggedIn>(params: T): LoggedIn {
  return { ...base(params), uid: params.uid };
}

export function addressExists<T extends AddressExists>(params: T): AddressExists {
  const { address, privateKey, networkId, adjudicator } = params;
  return { ...loggedIn(params), address, privateKey, networkId, adjudicator };
}

export function firstMoveSent<T extends FirstMoveSent>(params: T): FirstMoveSent {
  const { channelId, ourIndex, participants, channelNonce, turnNum, lastCommitment: lastPosition, libraryAddress, unhandledAction, requestedTotalFunds, requestedYourDeposit } = params;
  return { ...addressExists(params), channelId, ourIndex, participants, channelNonce, turnNum, lastCommitment: lastPosition, libraryAddress, unhandledAction, requestedTotalFunds, requestedYourDeposit };
}

export function channelOpen<T extends ChannelOpen>(params: T): ChannelOpen {
  const { penultimateCommitment, } = params;
  return { ...firstMoveSent(params), penultimateCommitment, };
}


export function challengeExists<T extends ChallengeExists>(params: T): ChallengeExists {
  return { ...channelOpen(params), challengeExpiry: params.challengeExpiry };
}

export function userAddressExists<T extends UserAddressExists>(params: T): UserAddressExists {
  return { ...channelOpen(params), userAddress: params.userAddress };
}
