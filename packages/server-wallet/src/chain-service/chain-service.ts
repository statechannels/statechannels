import {
  ContractArtifacts,
  createERC20DepositTransaction,
  createETHDepositTransaction,
} from '@statechannels/nitro-protocol';
import {BN, Uint256} from '@statechannels/wallet-core';
import {Contract, providers, utils, Wallet} from 'ethers';
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
  allowanceAlreadyIncreased?: boolean;
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

function isError(e: any): e is Error {
  return !!e.error;
}

export class ChainService implements ChainServiceInterface {
  private readonly ethWallet: NonceManager;
  private provider: providers.JsonRpcProvider;
  private addressToObservable: Map<Address, Observable<HoldingUpdatedArg>> = new Map();
  private addressToContract: Map<Address, Contract> = new Map();
  private transactionQueue: {
    request: providers.TransactionRequest;
    resolve: (response: providers.TransactionResponse) => void;
  }[] = [];

  constructor(provider: string, pk: string, pollingInterval?: number) {
    this.provider = new providers.JsonRpcProvider(provider);
    if (pollingInterval) this.provider.pollingInterval = pollingInterval;
    this.ethWallet = new NonceManager(new Wallet(pk, new providers.JsonRpcProvider(provider)));
  }

  // Only used for unit tests
  async destructor(): Promise<void> {
    this.provider.removeAllListeners();
    this.provider.polling = false;
    this.addressToContract.forEach(contract => contract.removeAllListeners());
  }

  private addContractMapping(assetHolderAddress: Address): Contract {
    const artifact = isEthAssetHolder(assetHolderAddress)
      ? ContractArtifacts.EthAssetHolderArtifact
      : ContractArtifacts.Erc20AssetHolderArtifact;
    const contract: Contract = new Contract(assetHolderAddress, artifact.abi, this.ethWallet);
    this.addressToContract.set(assetHolderAddress, contract);
    return contract;
  }

  private getOrAddContractMapping(contractAddress: Address): Contract {
    return this.addressToContract.get(contractAddress) ?? this.addContractMapping(contractAddress);
  }

  private getOrAddContractObservable(assetHolderAddress: Address): Observable<HoldingUpdatedArg> {
    let obs = this.addressToObservable.get(assetHolderAddress);
    if (!obs) {
      const contract = this.getOrAddContractMapping(assetHolderAddress);
      obs = this.addContractObservable(contract);
      this.addressToObservable.set(assetHolderAddress, obs);
    }
    return obs;
  }

  private async internalProcessTransactionQueue(): Promise<void> {
    while (this.transactionQueue.length) {
      try {
        const response = await this.ethWallet.sendTransaction(this.transactionQueue[0].request);
        this.transactionQueue[0].resolve(response);
      } catch (e) {
        this.transactionQueue[0].resolve(e);
      }
      this.transactionQueue.splice(0, 1);
    }
  }

  private async processTransactionQueue(): Promise<void> {
    if (this.transactionQueue.length === 1) {
      this.internalProcessTransactionQueue();
    }
  }

  private async sendTransaction(
    request: providers.TransactionRequest
  ): Promise<providers.TransactionResponse> {
    const response = await new Promise<providers.TransactionResponse | Error>(resolve => {
      this.transactionQueue.push({
        request,
        resolve,
      });
      this.processTransactionQueue();
    });
    if (isError(response)) throw response;
    return response;
  }

  async fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse> {
    const assetHolderAddress = arg.assetHolderAddress;
    const isEthFunding = isEthAssetHolder(assetHolderAddress);
    const createDepositTransaction = isEthFunding
      ? createETHDepositTransaction
      : createERC20DepositTransaction;

    if (!isEthFunding && !arg.allowanceAlreadyIncreased) {
      const assetHolderContract = this.getOrAddContractMapping(assetHolderAddress);
      const tokenAddress = await assetHolderContract.Token();
      const tokenContractInterface = new utils.Interface(ContractArtifacts.TokenArtifact.abi);
      const increaseAllowance = tokenContractInterface.encodeFunctionData('increaseAllowance', [
        assetHolderAddress,
        arg.amount,
      ]);
      const increaseAllowanceRequest = {
        data: increaseAllowance,
        to: tokenAddress,
      };

      await (await this.sendTransaction(increaseAllowanceRequest)).wait();
    }

    const depositRequest = {
      ...createDepositTransaction(arg.channelId, arg.expectedHeld, arg.amount),
      to: assetHolderAddress,
      value: isEthFunding ? arg.amount : undefined,
    };
    return await this.sendTransaction(depositRequest);
  }

  registerChannel(
    channelId: Bytes32,
    assetHolders: Address[],
    subscriber: ChainEventSubscriberInterface
  ): void {
    assetHolders.map(async assetHolder => {
      const obs = this.getOrAddContractObservable(assetHolder);
      // Fetch the current contract holding, and emit as an event
      const contract = this.getOrAddContractMapping(assetHolder);
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
