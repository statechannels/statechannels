import {AllocationItem, AssetOutcome} from '@statechannels/nitro-protocol';
import {Address, PrivateKey, SignedState, State, Uint256} from '@statechannels/wallet-core';
import {providers} from 'ethers';
import {Logger} from 'pino';

import {Bytes32} from '../type-aliases';

export type HoldingUpdatedArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  amount: Uint256;
};

export type AssetOutcomeUpdatedArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  newHoldings: Uint256;
  externalPayouts: AllocationItem[];
  internalPayouts: AllocationItem[];
  newAssetOutcome: AssetOutcome | '0x00'; // '0x00' in case the asset outcome hash was deleted on chain
};

export type FundChannelArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  expectedHeld: Uint256;
  amount: Uint256;
};

export type ChannelFinalizedArg = {
  channelId: Bytes32;
};

export interface ChainEventSubscriberInterface {
  holdingUpdated(arg: HoldingUpdatedArg): void;
  assetOutcomeUpdated(arg: AssetOutcomeUpdatedArg): void;
  channelFinalized(arg: ChannelFinalizedArg): void;
}

interface ChainEventEmitterInterface {
  registerChannel(
    channelId: Bytes32,
    assetHolders: Address[],
    listener: ChainEventSubscriberInterface
  ): void;
  unregisterChannel(channelId: Bytes32): void;
  destructor(): void;
}

interface ChainModifierInterface {
  // TODO: should these APIs return ethers TransactionResponses? Or is that too detailed for API consumers
  fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse>;
  concludeAndWithdraw(
    finalizationProof: SignedState[]
  ): Promise<providers.TransactionResponse | void>;
  pushOutcomeAndWithdraw(
    state: State,
    challengerAddress: Address
  ): Promise<providers.TransactionResponse>;
  challenge(
    challengeStates: SignedState[],
    privateKey: PrivateKey
  ): Promise<providers.TransactionResponse>;
  fetchBytecode(address: string): Promise<string>;
}

export type ChainServiceInterface = ChainModifierInterface & ChainEventEmitterInterface;

export type AllowanceMode = 'PerDeposit' | 'MaxUint';
export type ChainServiceArgs = {
  provider: string;
  pk: string;
  pollingInterval?: number;
  allowanceMode: AllowanceMode;
  logger?: Logger;
  blockConfirmations?: number;
};
