import {ContractArtifacts, createETHDepositTransaction} from '@statechannels/nitro-protocol';
import {BN, Uint256} from '@statechannels/wallet-core';
import {Contract, providers, Wallet} from 'ethers';
import {Observable} from 'rxjs';
import {filter} from 'rxjs/operators';

import {Address, Bytes32} from '../type-aliases';

export type SetFundingArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  amount: Uint256;
};

type FundChannelArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  expectedHeld: Uint256;
  amount: Uint256;
};

export interface ChainEventSubscriber {
  setFunding(arg: SetFundingArg): void;
}

interface ChainEventEmitterInterface {
  registerChannel(
    channelId: Bytes32,
    assetHolders: Address[],
    listener: ChainEventSubscriber
  ): void;
}

interface ChainMofifierInterface {
  fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse>;
}

export class ChainService implements ChainMofifierInterface, ChainEventEmitterInterface {
  private readonly ethWallet: Wallet;
  private provider: providers.JsonRpcProvider;
  private addressToObservable: Map<string, Observable<SetFundingArg>> = new Map();

  constructor(provider: string, pk: string, pollingInterval?: number) {
    this.provider = new providers.JsonRpcProvider(provider);
    if (pollingInterval) this.provider.pollingInterval = pollingInterval;
    this.ethWallet = new Wallet(pk, new providers.JsonRpcProvider(provider));
  }

  // Only used for unit tests
  async destructor(): Promise<void> {
    this.provider.removeAllListeners();
    this.provider.polling = false;
  }

  // todo: only works with eth-asset-holder
  fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse> {
    //todo: add retries
    const transactionRequest = {
      ...createETHDepositTransaction(arg.channelId, arg.expectedHeld, arg.amount),
      to: arg.assetHolderAddress,
      value: arg.amount,
    };
    return this.ethWallet.sendTransaction({
      ...transactionRequest,
    });
  }

  registerChannel(
    channelId: Bytes32,
    assetHolders: Address[],
    subscriber: ChainEventSubscriber
  ): void {
    assetHolders.map(assetHolder => {
      let obs = this.addressToObservable.get(assetHolder);
      if (!obs) {
        const contract: Contract = new Contract(
          assetHolder,
          ContractArtifacts.EthAssetHolderArtifact.abi
        ).connect(this.provider);
        obs = new Observable<SetFundingArg>(subscriber => {
          // todo: add other event types
          contract.on('Deposited', (destination, amountDeposited, destinationHoldings) =>
            subscriber.next({
              channelId: destination,
              assetHolderAddress: assetHolder,
              amount: BN.from(destinationHoldings),
            })
          );
        });
        this.addressToObservable.set(assetHolder, obs);
      }
      obs
        .pipe(filter(event => event.channelId === channelId))
        .subscribe({next: subscriber.setFunding});
    });
  }
}
