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

type AbiType = 'AssetHolder' | 'Token';

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

  private addContractMapping(assetHolderAddress: Address, abiType: AbiType): Contract {
    let artifact;
    switch (abiType) {
      case 'AssetHolder':
        artifact = isEthAssetHolder(assetHolderAddress)
          ? ContractArtifacts.EthAssetHolderArtifact
          : ContractArtifacts.Erc20AssetHolderArtifact;
        break;
      case 'Token':
        // todo: this should be the ERC20 artifact
        artifact = ContractArtifacts.TokenArtifact;
        break;
      default:
        throw new Error('Unknown abiType');
    }
    const contract: Contract = new Contract(assetHolderAddress, artifact.abi, this.ethWallet);
    this.addressToContract.set(assetHolderAddress, contract);
    return contract;
  }

  private getOrAddContractMapping(contractAddress: Address, type: AbiType): Contract {
    return (
      this.addressToContract.get(contractAddress) ?? this.addContractMapping(contractAddress, type)
    );
  }

  private getOrAddContractObservable(assetHolderAddress: Address): Observable<HoldingUpdatedArg> {
    let obs = this.addressToObservable.get(assetHolderAddress);
    if (!obs) {
      const contract = this.getOrAddContractMapping(assetHolderAddress, 'AssetHolder');
      obs = this.addContractObservable(contract);
      this.addressToObservable.set(assetHolderAddress, obs);
    }
    return obs;
  }

  async fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse> {
    const assetHolderAddress = arg.assetHolderAddress;
    const isEthFunding = isEthAssetHolder(assetHolderAddress);
    const createDepositTransaction = isEthFunding
      ? createETHDepositTransaction
      : createERC20DepositTransaction;

    if (!isEthFunding) {
      const assetHolderContract = this.getOrAddContractMapping(assetHolderAddress, 'AssetHolder');
      const tokenAddress = await assetHolderContract.Token();
      const tokenContract = this.getOrAddContractMapping(tokenAddress, 'Token');
      await (await tokenContract.increaseAllowance(assetHolderAddress, BN.from(arg.amount))).wait();
    }

    const transactionRequest = {
      ...createDepositTransaction(arg.channelId, arg.expectedHeld, arg.amount),
      to: assetHolderAddress,
      value: isEthFunding ? arg.amount : undefined,
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
      const obs = this.getOrAddContractObservable(assetHolder);
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
