import { TransactionRequest } from "ethers/providers";
import { WalletEvent, DisplayAction } from 'magmo-wallet-client';
import { Action } from 'redux';

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
}

export interface SignedPosition {
  data: string;
  signature: string;
}

export interface ChannelPartiallyOpen extends AddressExists {
  channelId: string;
  libraryAddress: string;
  ourIndex: number;
  participants: [string, string];
  channelNonce: number;
  turnNum: number;
  lastPosition: SignedPosition;
}

export interface ChannelOpen extends ChannelPartiallyOpen {
  penultimatePosition: SignedPosition;
  unhandledAction?: Action;
  requestedTotalFunds: string;
  requestedYourDeposit: string;
}
export interface ChannelOpenAndTransactionExists extends ChannelOpen {
  transactionHash: string;
}

export interface AdjudicatorMightExist extends ChannelOpen {
  adjudicator?: string;
}

export interface AdjudicatorExists extends ChannelOpen {
  adjudicator: string;
}

export interface TransactionExists {
  transactionHash: string;
}
export interface ChallengeExists extends AdjudicatorExists {
  challengeExpiry?: number;
}

export interface UserAddressExists extends AdjudicatorExists {
  userAddress: string;
}

// creators
export function base<T extends Base>(params: T): Base {
  const { messageOutbox, transactionOutbox, displayOutbox } = params;
  return { messageOutbox, transactionOutbox, displayOutbox };
}

export function loggedIn<T extends LoggedIn>(params: T): LoggedIn {
  return { ...base(params), uid: params.uid };
}

export function addressExists<T extends AddressExists>(params: T): AddressExists {
  const { address, privateKey, networkId } = params;
  return { ...loggedIn(params), address, privateKey, networkId };
}

export function channelPartiallyOpen<T extends ChannelPartiallyOpen>(params: T): ChannelPartiallyOpen {
  const { channelId, ourIndex, participants, channelNonce, turnNum, lastPosition, libraryAddress } = params;
  return { ...addressExists(params), channelId, ourIndex, participants, channelNonce, turnNum, lastPosition, libraryAddress };
}

export function channelOpen<T extends ChannelOpen>(params: T): ChannelOpen {
  const { penultimatePosition, unhandledAction, requestedTotalFunds, requestedYourDeposit } = params;
  return { ...channelPartiallyOpen(params), penultimatePosition, unhandledAction, requestedTotalFunds, requestedYourDeposit };
}


export function adjudicatorMightExist<T extends AdjudicatorMightExist>(params: T): AdjudicatorMightExist {
  return { ...channelOpen(params), adjudicator: params.adjudicator };
}

export function adjudicatorExists<T extends AdjudicatorExists>(params: T): AdjudicatorExists {
  return { ...channelOpen(params), adjudicator: params.adjudicator };
}

export function challengeExists<T extends ChallengeExists>(params: T): ChallengeExists {
  return { ...adjudicatorExists(params), challengeExpiry: params.challengeExpiry };
}

export function userAddressExists<T extends UserAddressExists>(params: T): UserAddressExists {
  return { ...adjudicatorExists(params), userAddress: params.userAddress };
}
