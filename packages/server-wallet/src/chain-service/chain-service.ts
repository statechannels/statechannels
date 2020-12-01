import {
  ContractArtifacts,
  createERC20DepositTransaction,
  createETHDepositTransaction,
  getChannelId,
  Transactions,
} from '@statechannels/nitro-protocol';
import {
  Address,
  BN,
  makeAddress,
  makeDestination,
  SignedState,
  toNitroSignedState,
} from '@statechannels/wallet-core';
import {constants, Contract, ContractInterface, Event, providers, Wallet} from 'ethers';
import {concat, from, Observable, Subscription} from 'rxjs';
import {filter, share} from 'rxjs/operators';
import {NonceManager} from '@ethersproject/experimental';
import PQueue from 'p-queue';

import {Bytes32} from '../type-aliases';

import {
  AllowanceMode,
  AssetTransferredArg,
  ChainEventSubscriberInterface,
  ChainServiceArgs,
  ChainServiceInterface,
  FundChannelArg,
  HoldingUpdatedArg,
} from './types';

const Deposited = 'Deposited' as const;
const AssetTransferred = 'AssetTransferred' as const;
type DepositedEvent = {type: 'Deposited'; ethersEvent?: Event} & HoldingUpdatedArg;
type AssetTransferredEvent = {type: 'AssetTransferred'; ethersEvent: Event} & AssetTransferredArg;
type ContractEvent = DepositedEvent | AssetTransferredEvent;

// TODO: is it reasonable to assume that the ethAssetHolder address is defined as runtime configuration?
/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const ethAssetHolderAddress = makeAddress(
  process.env.ETH_ASSET_HOLDER_ADDRESS || constants.AddressZero
);
const nitroAdjudicatorAddress = makeAddress(
  process.env.NITRO_ADJUDICATOR_ADDRESS! || constants.AddressZero
);
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */

function isEthAssetHolder(address: Address): boolean {
  return address === ethAssetHolderAddress;
}

const blockConfirmations = 5;

export class ChainService implements ChainServiceInterface {
  private readonly ethWallet: NonceManager;
  private provider: providers.JsonRpcProvider;
  private allowanceMode: AllowanceMode;
  private addressToObservable: Map<Address, Observable<ContractEvent>> = new Map();
  private addressToContract: Map<Address, Contract> = new Map();
  private channelToSubscription: Map<Bytes32, Subscription[]> = new Map();
  private nitroAdjudicator: Contract;

  private transactionQueue = new PQueue({concurrency: 1});

  constructor({provider, pk, allowanceMode, pollingInterval}: ChainServiceArgs) {
    this.provider = new providers.JsonRpcProvider(provider);
    this.allowanceMode = allowanceMode;
    if (provider.includes('0.0.0.0') || provider.includes('localhost')) {
      pollingInterval = pollingInterval ?? 50;
    }
    if (pollingInterval) this.provider.pollingInterval = pollingInterval;
    this.ethWallet = new NonceManager(new Wallet(pk, new providers.JsonRpcProvider(provider)));
    this.nitroAdjudicator = new Contract(
      nitroAdjudicatorAddress,
      ContractArtifacts.NitroAdjudicatorArtifact.abi,
      this.ethWallet
    );
  }

  // Only used for unit tests
  async destructor(): Promise<void> {
    this.provider.removeAllListeners();
    this.provider.polling = false;
    this.addressToContract.forEach(contract => contract.removeAllListeners());
  }

  private addContractMapping(
    assetHolderAddress: Address,
    contractInterface?: ContractInterface
  ): Contract {
    const abi =
      contractInterface ??
      (isEthAssetHolder(assetHolderAddress)
        ? ContractArtifacts.EthAssetHolderArtifact.abi
        : ContractArtifacts.Erc20AssetHolderArtifact.abi);
    const contract: Contract = new Contract(assetHolderAddress, abi, this.ethWallet);
    this.addressToContract.set(assetHolderAddress, contract);
    return contract;
  }

  private getOrAddContractMapping(
    contractAddress: Address,
    contractInterface?: ContractInterface
  ): Contract {
    return (
      this.addressToContract.get(contractAddress) ??
      this.addContractMapping(contractAddress, contractInterface)
    );
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

  private async sendTransaction(
    transactionRequest: providers.TransactionRequest
  ): Promise<providers.TransactionResponse> {
    return this.transactionQueue.add(async () => {
      try {
        return await this.ethWallet.sendTransaction(transactionRequest);
      } catch (e) {
        // https://github.com/ethers-io/ethers.js/issues/972
        this.ethWallet.incrementTransactionCount(-1);
        throw e;
      }
    });
  }

  async fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse> {
    const assetHolderAddress = arg.assetHolderAddress;
    const isEthFunding = isEthAssetHolder(assetHolderAddress);

    if (!isEthFunding) {
      await this.increaseAllowance(assetHolderAddress, arg.amount);
    }

    const createDepositTransaction = isEthFunding
      ? createETHDepositTransaction
      : createERC20DepositTransaction;
    const depositRequest = {
      ...createDepositTransaction(arg.channelId, arg.expectedHeld, arg.amount),
      to: assetHolderAddress,
      value: isEthFunding ? arg.amount : undefined,
    };
    return this.sendTransaction(depositRequest);
  }

  async concludeAndWithdraw(
    finalizationProof: SignedState[]
  ): Promise<providers.TransactionResponse | void> {
    const transactionRequest = {
      ...Transactions.createConcludePushOutcomeAndTransferAllTransaction(
        finalizationProof.flatMap(toNitroSignedState)
      ),
      to: nitroAdjudicatorAddress,
    };

    const captureExpectedErrors = async (reason: any) => {
      if (reason.error?.message.includes('Channel finalized')) {
        return;
      }
      const firstState = finalizationProof[0];
      const [, finalizesAt] = await this.nitroAdjudicator.getChannelStorage(
        getChannelId({
          ...firstState,
          participants: firstState.participants.map(p => p.signingAddress),
        })
      );

      const latestBlockTimestamp = (
        await this.provider.getBlock(await this.provider.getBlockNumber())
      ).timestamp;
      // Check if the channel has been finalized in the past
      if (latestBlockTimestamp >= Number(finalizesAt)) return;

      throw reason;
    };
    const transactionResponse = this.sendTransaction(transactionRequest).catch(
      captureExpectedErrors
    );

    transactionResponse
      .then(receipt => {
        if (receipt) return receipt.wait();
        return;
      })
      .catch(captureExpectedErrors);

    return transactionResponse;
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
      const currentHolding = from(this.getInitialHoldings(contract, channelId));

      const subscription = concat<ContractEvent>(
        currentHolding,
        obs.pipe(filter(event => event.channelId === channelId))
      ).subscribe({
        next: async event => {
          switch (event.type) {
            case Deposited:
              await this.waitForConfirmations(event.ethersEvent);
              subscriber.holdingUpdated(event);
              break;
            case AssetTransferred:
              await this.waitForConfirmations(event.ethersEvent);
              subscriber.assetTransferred(event);
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

  private async getInitialHoldings(contract: Contract, channelId: string): Promise<DepositedEvent> {
    const holding = BN.from(await contract.holdings(channelId));

    return {
      type: Deposited,
      channelId,
      assetHolderAddress: makeAddress(contract.address),
      amount: BN.from(holding),
    };
  }

  private async waitForConfirmations(event: Event | undefined): Promise<void> {
    if (event) {
      // `tx.wait(n)` resolves after n blocks are mined that include the given transaction `tx`
      // See https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse
      await (await event.getTransaction()).wait(blockConfirmations + 1);
      return;
    }
  }

  private addContractObservable(contract: Contract): Observable<ContractEvent> {
    // Create an observable that emits events on contract events
    const obs = new Observable<ContractEvent>(subs => {
      // TODO: add other event types
      contract.on(Deposited, (destination, _amountDeposited, destinationHoldings, event) =>
        subs.next({
          type: Deposited,
          channelId: destination,
          assetHolderAddress: makeAddress(contract.address),
          amount: BN.from(destinationHoldings),
          ethersEvent: event,
        })
      );
      contract.on(AssetTransferred, (channelId, destination, payoutAmount, event) =>
        subs.next({
          type: AssetTransferred,
          channelId,
          assetHolderAddress: makeAddress(contract.address),
          to: makeDestination(destination),
          amount: BN.from(payoutAmount),
          ethersEvent: event,
        })
      );
    });

    return obs.pipe(share());
  }

  private async increaseAllowance(assetHolderAddress: Address, amount: string): Promise<void> {
    const assetHolderContract = this.getOrAddContractMapping(assetHolderAddress);
    const tokenAddress = await assetHolderContract.Token();
    const tokenContract = this.getOrAddContractMapping(
      tokenAddress,
      ContractArtifacts.TokenArtifact.abi
    );

    switch (this.allowanceMode) {
      case 'PerDeposit': {
        const increaseAllowance = tokenContract.interface.encodeFunctionData('increaseAllowance', [
          assetHolderAddress,
          amount,
        ]);
        const increaseAllowanceRequest = {
          data: increaseAllowance,
          to: tokenContract.address,
        };

        await this.sendTransaction(increaseAllowanceRequest);
        break;
      }
      case 'MaxUint': {
        const currentAllowance = await tokenContract.allowance(
          await this.ethWallet.getAddress(),
          assetHolderAddress
        );
        // Half of MaxUint256 is the threshold for bumping up the allowance
        if (BN.gt(BN.div(constants.MaxUint256, 2), currentAllowance)) {
          const approveAllowance = tokenContract.interface.encodeFunctionData('approve', [
            assetHolderAddress,
            constants.MaxUint256,
          ]);
          const approveAllowanceRequest = {
            data: approveAllowance,
            to: tokenContract.address,
          };

          await this.sendTransaction(approveAllowanceRequest);
          break;
        }
      }
    }
  }

  /**
   *
   * @param appDefinition Address of state channels app
   *
   * Rejects with 'Bytecode missint' if there is no contract deployed at `appDefinition`.
   */
  public async fetchBytecode(appDefinition: string): Promise<string> {
    const result = await this.provider.getCode(appDefinition);

    if (result === '0x') throw new Error('Bytecode missing');

    return result;
  }
}
