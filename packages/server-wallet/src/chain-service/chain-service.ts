import {
  ContractArtifacts,
  createERC20DepositTransaction,
  createETHDepositTransaction,
  Transactions,
} from '@statechannels/nitro-protocol';
import {BN, SignedState, toNitroSignedState, Uint256} from '@statechannels/wallet-core';
import {Contract, providers, utils, Wallet} from 'ethers';
import {concat, from, Observable, Subscription} from 'rxjs';
import {filter, share} from 'rxjs/operators';
import {NonceManager} from '@ethersproject/experimental';

import {Address, Bytes32} from '../type-aliases';

// todo: is it reasonable to assume that the ethAssetHolder address is defined as runtime configuration?
/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const ethAssetHolderAddress = process.env.ETH_ASSET_HOLDER_ADDRESS!;
const nitroAdjudicatorAddress = process.env.NITRO_ADJUDICATOR_ADDRESS!;
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */

export type HoldingUpdatedArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  amount: Uint256;
};

export type AssetTransferredArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  to: Bytes32;
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
  onAssetTransferred(arg: AssetTransferredArg): void;
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
  concludeAndWithdraw(finalizationProof: SignedState[]): Promise<providers.TransactionResponse>;
  fetchBytecode(address: string): Promise<string>;
}

export type ChainServiceInterface = ChainModifierInterface & ChainEventEmitterInterface;

type TransactionQueueEntry = {
  request: providers.TransactionRequest;
  resolve: (response: providers.TransactionResponse) => void;
};

const Deposited = 'Deposited' as const;
const AssetTransferred = 'AssetTransferred' as const;
type DepositedEvent = {type: 'Deposited'} & HoldingUpdatedArg;
type AssetTransferredEvent = {type: 'AssetTransferred'} & AssetTransferredArg;
type ContractEvent = DepositedEvent | AssetTransferredEvent;

function isEthAssetHolder(address: Address): boolean {
  return address === ethAssetHolderAddress;
}

function isError(e: any): e is Error {
  return !!e.error;
}

export class ChainService implements ChainServiceInterface {
  private readonly ethWallet: NonceManager;
  private provider: providers.JsonRpcProvider;
  private addressToObservable: Map<Address, Observable<ContractEvent>> = new Map();
  private addressToContract: Map<Address, Contract> = new Map();
  private channelToSubscription: Map<Bytes32, Subscription[]> = new Map();

  // todo: the custom FIFO promise queue can be replaced by https://www.npmjs.com/package/p-queue
  private transactionQueue: TransactionQueueEntry[] = [];

  constructor(provider: string, pk: string, pollingInterval?: number) {
    this.provider = new providers.JsonRpcProvider(provider);
    if (provider.includes('0.0.0.0') || provider.includes('localhost')) {
      pollingInterval = pollingInterval ?? 50;
    }
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

  private getOrAddContractObservable(assetHolderAddress: Address): Observable<ContractEvent> {
    let obs = this.addressToObservable.get(assetHolderAddress);
    if (!obs) {
      const contract = this.getOrAddContractMapping(assetHolderAddress);
      obs = this.addContractObservable(contract);
      this.addressToObservable.set(assetHolderAddress, obs);
    }
    return obs;
  }

  private async transactionQueueLoop(): Promise<void> {
    while (this.transactionQueue.length) {
      try {
        const response = await this.ethWallet.sendTransaction(this.transactionQueue[0].request);
        this.transactionQueue[0].resolve(response);
      } catch (e) {
        // https://github.com/ethers-io/ethers.js/issues/972
        this.ethWallet.incrementTransactionCount(-1);
        this.transactionQueue[0].resolve(e);
      }
      this.transactionQueue.splice(0, 1);
    }
  }

  private async addToTransactionQueue(entry: TransactionQueueEntry): Promise<void> {
    this.transactionQueue.push(entry);
    // If there is one element in the queue, we have pushed this element. We need to trigger queue loop.
    // If there are two or more elements in the queue, whoever pushed the first element on the queue already triggered the queue loop
    if (this.transactionQueue.length === 1) {
      this.transactionQueueLoop();
    }
  }

  private async sendTransaction(
    request: providers.TransactionRequest
  ): Promise<providers.TransactionResponse> {
    const response = await new Promise<providers.TransactionResponse | Error>(resolve => {
      this.addToTransactionQueue({
        request,
        resolve,
      });
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
    return this.sendTransaction(depositRequest);
  }

  async concludeAndWithdraw(
    finalizationProof: SignedState[]
  ): Promise<providers.TransactionResponse> {
    const transactionRequest = {
      ...Transactions.createConcludePushOutcomeAndTransferAllTransaction(
        finalizationProof.flatMap(toNitroSignedState)
      ),
      to: nitroAdjudicatorAddress,
    };

    return this.sendTransaction(transactionRequest);
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
          type: Deposited,
          channelId,
          assetHolderAddress: contract.address,
          amount: BN.from(holding),
        }))
      );

      const subscription = concat(
        currentHolding,
        obs.pipe(filter(event => event.channelId === channelId))
      ).subscribe({
        next: event => {
          switch (event.type) {
            case Deposited:
              subscriber.holdingUpdated(event);
              break;
            case AssetTransferred:
              subscriber.onAssetTransferred(event);
              break;
            default:
              throw new Error('Unexpected event from contract observable');
          }
        },
      });
      const subscriptions = this.channelToSubscription.get(channelId) ?? [];
      this.channelToSubscription.set(channelId, [...subscriptions, subscription]);
    });
  }

  /** Implementation note:
   *  The following is a simplified API that assumes a single registerChannel call per channel.
   *  If we would like to allow for multiple registrations per channel, registerChannel should return a registration ID.
   *  unregisterChannel will require the registration ID as a parameter.
   */
  unregisterChannel(channelId: Bytes32): void {
    const subscriptions = this.channelToSubscription.get(channelId);
    if (subscriptions?.length !== 1) {
      throw new Error(
        'Unregister channel implementation only works when there is one subscriber per channel'
      );
    }
    subscriptions.map(s => s.unsubscribe());
  }

  private addContractObservable(contract: Contract): Observable<ContractEvent> {
    // Create an observable that emits events on contract events
    const obs = new Observable<ContractEvent>(subs => {
      // todo: add other event types
      contract.on(Deposited, (destination, _amountDeposited, destinationHoldings) =>
        subs.next({
          type: Deposited,
          channelId: destination,
          assetHolderAddress: contract.address,
          amount: BN.from(destinationHoldings),
        })
      );
      contract.on(AssetTransferred, (channelId, destination, payoutAmount) =>
        subs.next({
          type: AssetTransferred,
          channelId,
          assetHolderAddress: contract.address,
          to: destination,
          amount: BN.from(payoutAmount),
        })
      );
    });

    return obs.pipe(share());
  }

  public async fetchBytecode(appDefinition: string): Promise<string> {
    return this.provider.getCode(appDefinition);
  }
}
