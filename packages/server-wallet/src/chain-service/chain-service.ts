import {
  ContractArtifacts,
  createERC20DepositTransaction,
  createETHDepositTransaction,
} from '@statechannels/nitro-protocol';
import {BN, Uint256} from '@statechannels/wallet-core';
import {Contract, providers, Wallet} from 'ethers';
import {concat, from, Observable} from 'rxjs';
import {filter, share} from 'rxjs/operators';
import {NonceManager} from '@ethersproject/experimental';

import {Address, Bytes32} from '../type-aliases';

// todo: is it reasonablet to assume that the ethAssetHolder address is defined as runtime configuration?
/* eslint-disable-next-line no-process-env, @typescript-eslint/no-non-null-assertion */
const ethAssetHolderAddress = process.env.ETH_ASSET_HOLDER_ADDRESS!;

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

function isEthAssetHolder(address: Address): boolean {
  return address === ethAssetHolderAddress;
}

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

  private addContractMapping(assetHolderAddress: Address): Contract {
    const artifact = isEthAssetHolder(assetHolderAddress)
      ? ContractArtifacts.EthAssetHolderArtifact
      : ContractArtifacts.Erc20AssetHolderArtifact;
    const contract: Contract = new Contract(assetHolderAddress, artifact.abi, this.provider);
    this.addressToContract.set(assetHolderAddress, contract);
    return contract;
  }

  async fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse> {
    const assetHolderAddress = arg.assetHolderAddress;
    const createDepositTransaction = isEthAssetHolder(assetHolderAddress)
      ? createETHDepositTransaction
      : createERC20DepositTransaction;

    const transactionRequest = {
      ...createDepositTransaction(arg.channelId, arg.expectedHeld, arg.amount),
      to: assetHolderAddress,
      value: isEthAssetHolder(assetHolderAddress) ? arg.amount : undefined,
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
        const contract = this.addContractMapping(assetHolder);
        obs = this.addContractObservable(contract);
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

  private addContractObservable(contract: Contract): Observable<HoldingUpdatedArg> {
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
