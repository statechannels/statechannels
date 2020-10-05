import {ContractArtifacts, createETHDepositTransaction} from '@statechannels/nitro-protocol';
import {BN, Uint256} from '@statechannels/wallet-core';
import {Contract, providers, Wallet} from 'ethers';
import {concat, from, Observable} from 'rxjs';
import {filter, share} from 'rxjs/operators';
import {NonceManager} from '@ethersproject/experimental';

import {Address, Bytes32} from '../type-aliases';

export type HoldingUpdatedArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  amount: Uint256;
};

export type FundChannelArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  expectedHeld: Uint256;
  amount: Uint256;
};

export interface ChainEventSubscriberInterface {
  onHoldingUpdated(arg: HoldingUpdatedArg): void;
}

interface ChainEventEmitterInterface {
  registerChannel(
    channelId: Bytes32,
    assetHolders: Address[],
    listener: ChainEventSubscriberInterface
  ): void;
}

interface ChainModifierInterface {
  fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse>;
}

export type ChainServiceInterface = ChainModifierInterface & ChainEventEmitterInterface;

export class ChainService implements ChainServiceInterface {
  private readonly ethWallet: NonceManager;
  private provider: providers.JsonRpcProvider;
  private addressToObservable: Map<Address, Observable<HoldingUpdatedArg>> = new Map();
  private addressToContract: Map<Address, Contract> = new Map();

  constructor(provider: string, pk: string, pollingInterval?: number) {
    this.provider = new providers.JsonRpcProvider(provider);
    if (pollingInterval) this.provider.pollingInterval = pollingInterval;
    this.ethWallet = new NonceManager(new Wallet(pk, new providers.JsonRpcProvider(provider)));
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
    subscriber: ChainEventSubscriberInterface
  ): void {
    assetHolders.map(async assetHolder => {
      let obs = this.addressToObservable.get(assetHolder);
      if (!obs) {
        const contract: Contract = new Contract(
          assetHolder,
          ContractArtifacts.EthAssetHolderArtifact.abi
        ).connect(this.provider);
        this.addressToContract.set(assetHolder, contract);

        obs = this.createContractObservable(contract);
        this.addressToObservable.set(assetHolder, obs);
      }
      // Fetch the current contract holding, and emit as an event
      const contract = this.addressToContract.get(assetHolder);
      if (!contract) throw new Error('The addressToContract mapping should contain the contract');
      const currentHolding = from(
        (contract.holdings(channelId) as Promise<string>).then((holding: any) => ({
          channelId,
          assetHolderAddress: contract.address,
          amount: BN.from(holding),
        }))
      );

      // todo: subscriber method should be based on event type
      concat(currentHolding, obs.pipe(filter(event => event.channelId === channelId))).subscribe({
        next: subscriber.onHoldingUpdated,
      });
    });
  }

  private createContractObservable(contract: Contract): Observable<HoldingUpdatedArg> {
    // Create an observable that emits events on contract events
    const obs = new Observable<HoldingUpdatedArg>(subs => {
      // todo: add other event types
      contract.on('Deposited', (destination, amountDeposited, destinationHoldings) =>
        subs.next({
          channelId: destination,
          assetHolderAddress: contract.address,
          amount: BN.from(destinationHoldings),
        })
      );
    });

    return obs.pipe(share());
  }
}
