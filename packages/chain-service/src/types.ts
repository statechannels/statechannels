import {Bytes32} from '@statechannels/client-api-schema';
import {Address, Uint256, SignedState, Destination} from '@statechannels/wallet-core';
import {providers} from 'ethers';

export type HoldingUpdatedArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  amount: Uint256;
};

export type AssetTransferredArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  to: Destination;
  amount: Uint256;
};

export type FundChannelArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  expectedHeld: Uint256;
  amount: Uint256;
  allowanceAlreadyIncreased?: boolean;
};

export interface ChainEventSubscriberInterface {
  holdingUpdated(arg: HoldingUpdatedArg): void;
  assetTransferred(arg: AssetTransferredArg): void;
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
  // todo: should these APIs return ethers TransactionResponses? Or is that too detailed for API consumers
  fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse>;
  concludeAndWithdraw(
    finalizationProof: SignedState[]
  ): Promise<providers.TransactionResponse | void>;
  fetchBytecode(address: string): Promise<string>;
}

export type ChainServiceInterface = ChainModifierInterface & ChainEventEmitterInterface;

export type DepositedEvent = {type: 'Deposited'} & HoldingUpdatedArg;
export type AssetTransferredEvent = {type: 'AssetTransferred'} & AssetTransferredArg;
export type ContractEvent = DepositedEvent | AssetTransferredEvent;
