import {
  ContractArtifacts,
  createERC20DepositTransaction,
  createETHDepositTransaction,
  getChallengeRegisteredEvent,
  getChannelId,
  Transactions,
  ChallengeRegisteredEvent as NitroChallengeRegisteredEvent,
  createPushOutcomeTransaction,
} from '@statechannels/nitro-protocol';
import {
  Address,
  BN,
  makeAddress,
  makeDestination,
  PrivateKey,
  SignedState,
  State,
  toNitroSignedState,
  toNitroState,
} from '@statechannels/wallet-core';
import {constants, Contract, ContractInterface, Event, providers, Wallet} from 'ethers';
import {Observable, Subscription} from 'rxjs';
import {filter} from 'rxjs/operators';
import {NonceManager} from '@ethersproject/experimental';
import PQueue from 'p-queue';
import {Logger} from 'pino';
import _ from 'lodash';

import {Bytes32} from '../type-aliases';
import {createLogger} from '../logger';
import {defaultTestConfig} from '../config';

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
const ChallengeRegistered = 'ChallengeRegistered' as const;
type DepositedEvent = {type: 'Deposited'; ethersEvent: Event} & HoldingUpdatedArg;
type AssetTransferredEvent = {type: 'AssetTransferred'; ethersEvent: Event} & AssetTransferredArg;
type ChallengeRegisteredEvent = {
  type: 'ChallengeRegistered';
  ethersEvent: Event;
} & NitroChallengeRegisteredEvent;
type AssetHolderEvent = DepositedEvent | AssetTransferredEvent;

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

export class ChainService implements ChainServiceInterface {
  private logger: Logger;
  private readonly ethWallet: NonceManager;
  private provider: providers.JsonRpcProvider;
  private allowanceMode: AllowanceMode;
  private addressToObservable: Map<Address, Observable<AssetHolderEvent>> = new Map();
  private addressToContract: Map<Address, Contract> = new Map();
  private channelToSubscription: Map<Bytes32, Subscription[]> = new Map();
  private channelToSubscriber: Map<Bytes32, ChainEventSubscriberInterface[]> = new Map();
  private nitroAdjudicator: Contract;
  private nitroAdjudicatorObservable: Observable<ChallengeRegisteredEvent>;

  private readonly blockConfirmations: number;
  private transactionQueue = new PQueue({concurrency: 1});

  constructor({
    provider,
    pk,
    pollingInterval,
    logger,
    blockConfirmations,
    allowanceMode,
  }: Partial<ChainServiceArgs>) {
    if (!pk) throw new Error('ChainService: Private key not provided');
    this.provider = new providers.JsonRpcProvider(provider);
    this.ethWallet = new NonceManager(new Wallet(pk, this.provider));
    this.blockConfirmations = blockConfirmations ?? 5;
    this.logger = logger
      ? logger.child({module: 'ChainService'})
      : createLogger(defaultTestConfig());

    this.allowanceMode = allowanceMode || 'MaxUint';
    if (provider && (provider.includes('0.0.0.0') || provider.includes('localhost'))) {
      pollingInterval = pollingInterval ?? 50;
    }
    if (pollingInterval) this.provider.pollingInterval = pollingInterval;

    this.nitroAdjudicator = this.getOrAddContractMapping(
      nitroAdjudicatorAddress,
      ContractArtifacts.NitroAdjudicatorArtifact.abi
    );
    this.nitroAdjudicatorObservable = new Observable<ChallengeRegisteredEvent>(subs => {
      this.nitroAdjudicator.on(ChallengeRegistered, (...args) =>
        subs.next({
          type: ChallengeRegistered,
          ...getChallengeRegisteredEvent(args),
          ethersEvent: args[args.length - 1],
        })
      );
    });
  }

  // Only used for unit tests
  destructor(): void {
    this.provider.removeAllListeners();
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

  private getOrAddAssetHolderObservable(assetHolderAddress: Address): Observable<AssetHolderEvent> {
    let obs = this.addressToObservable.get(assetHolderAddress);
    if (!obs) {
      const contract = this.getOrAddContractMapping(assetHolderAddress);
      obs = this.addAssetHolderObservable(contract);
      this.addressToObservable.set(assetHolderAddress, obs);
    }
    return obs;
  }

  private addSubscription(channelId: string, subscription: Subscription) {
    const subscriptions = this.channelToSubscription.get(channelId) ?? [];
    this.channelToSubscription.set(channelId, [...subscriptions, subscription]);
  }

  private async sendTransaction(
    transactionRequest: providers.TransactionRequest
  ): Promise<providers.TransactionResponse> {
    return this.transactionQueue.add(async () => {
      try {
        this.logger.debug({...transactionRequest}, 'Submitting transaction to the blockchain');
        return await this.ethWallet.sendTransaction(transactionRequest);
      } catch (err) {
        // https://github.com/ethers-io/ethers.js/issues/972
        this.ethWallet.incrementTransactionCount(-1);
        this.logger.error({err}, 'Transaction submission failed');
        throw err;
      }
    });
  }

  async fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse> {
    this.logger.info({...arg}, 'Attempting to fund channel');

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

    const tx = await this.sendTransaction(depositRequest);

    this.logger.info(
      {
        channelId: arg.channelId,
        assetHolderAddress,
        tx: tx.hash,
      },
      'Finished funding channel'
    );

    return tx;
  }

  async concludeAndWithdraw(
    finalizationProof: SignedState[]
  ): Promise<providers.TransactionResponse | void> {
    if (!finalizationProof.length)
      throw new Error('ChainService: concludeAndWithdraw was called with an empty array?');

    const channelId = getChannelId({
      ...finalizationProof[0],
      participants: finalizationProof[0].participants.map(p => p.signingAddress),
    });

    this.logger.info({channelId}, 'Attempting to conclude and withdraw funds from channel');

    const transactionRequest = {
      ...Transactions.createConcludePushOutcomeAndTransferAllTransaction(
        finalizationProof.flatMap(toNitroSignedState)
      ),
      to: nitroAdjudicatorAddress,
    };

    const captureExpectedErrors = async (reason: any) => {
      if (reason.error?.message.includes('Channel finalized')) {
        this.logger.warn(
          {channelId, determinedBy: 'Revert reason'},
          'Transaction to conclude channel failed: channel is already finalized'
        );
        return;
      }

      const [, finalizesAt] = await this.nitroAdjudicator.getChannelStorage(channelId);

      const {timestamp: latestBlockTimestamp} = await this.provider.getBlock(
        await this.provider.getBlockNumber()
      );

      // Check if the channel has been finalized in the past
      if (latestBlockTimestamp >= Number(finalizesAt)) {
        this.logger.warn(
          {channelId, determinedBy: 'Javascript check'},
          'Transaction to conclude channel failed: channel is already finalized'
        );
        return;
      }

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

  async challenge(
    challengeStates: SignedState[],
    privateKey: PrivateKey
  ): Promise<providers.TransactionResponse> {
    if (!challengeStates.length) {
      throw new Error('Must challenge with at least one state');
    }

    const challengeTransactionRequest = {
      ...Transactions.createChallengeTransaction(
        challengeStates.flatMap(toNitroSignedState),
        privateKey
      ),
      to: nitroAdjudicatorAddress,
    };
    return this.sendTransaction(challengeTransactionRequest);
  }

  async pushOutcome(state: State): Promise<providers.TransactionResponse> {
    const lastState = toNitroState(state);
    const channelId = getChannelId(lastState.channel);
    const [
      turnNumRecord,
      finalizesAt,
      _fingerprint,
    ] = await this.nitroAdjudicator.getChannelStorage(channelId);

    const pushTransactionRequest = {
      ...createPushOutcomeTransaction(
        turnNumRecord,
        finalizesAt,
        lastState,
        lastState.outcome,
        false,
        true
      ),
      to: nitroAdjudicatorAddress,
    };
    return this.sendTransaction(pushTransactionRequest);
  }

  registerChannel(
    channelId: Bytes32,
    assetHolders: Address[],
    subscriber: ChainEventSubscriberInterface
  ): void {
    this.logger.info(
      {channelId, assetHolders},
      'Registering channel with ChainService monitor for Deposited and AssetTransferred events'
    );

    this.channelToSubscriber.set(channelId, [
      ...(this.channelToSubscriber.get(channelId) ?? []),
      subscriber,
    ]);

    assetHolders.map(assetHolder => {
      this.getOrAddAssetHolderObservable(assetHolder);
      const contract = this.getOrAddContractMapping(assetHolder);
      if (!contract) throw new Error('The addressToContract mapping should contain the contract');
      // Fetch the current contract holding, and emit as an event
      this.getInitialHoldings(contract, channelId).then(initialHoldings =>
        subscriber.holdingUpdated(initialHoldings)
      );
    });

    const subscription = this.nitroAdjudicatorObservable
      .pipe(filter(event => event.channelId === channelId))
      .subscribe({
        next: async event => {
          this.logger.debug(
            {channelId, tx: event.ethersEvent?.transactionHash},
            `Observed ${event.type} event on-chain; beginning to wait for confirmations`
          );
          this.whenFinalized(channelId, event.finalizesAt, 0);
        },
      });
    this.addSubscription(channelId, subscription);
  }

  unregisterChannel(channelId: Bytes32): void {
    this.channelToSubscription.get(channelId)?.map(s => s.unsubscribe());
  }

  private async whenFinalized(channelId: Bytes32, finalizesAt: number, tryNum: number) {
    if (tryNum > 4) return;

    const nowMs = Date.now();
    const finalizesAtMs = finalizesAt * 1_000;
    if (nowMs < finalizesAtMs) {
      setTimeout(() => this.whenFinalized(channelId, finalizesAt, 0), nowMs - finalizesAt);
      return;
    }
    const [, storageFinalizesAt] = await this.nitroAdjudicator.getChannelStorage(channelId);
    const blockTime = (await this.provider.getBlock(await this.provider.getBlockNumber()))
      .timestamp;
    if (blockTime >= storageFinalizesAt) {
      // emit event
      return;
    }
    setTimeout(
      () => this.whenFinalized(channelId, finalizesAt, 0),
      2 * (storageFinalizesAt - blockTime * 1_000),
      tryNum + 1
    );
  }

  private async getInitialHoldings(
    contract: Contract,
    channelId: string
  ): Promise<HoldingUpdatedArg> {
    const holding = BN.from(await contract.holdings(channelId));

    return {
      channelId,
      assetHolderAddress: makeAddress(contract.address),
      amount: BN.from(holding),
    };
  }

  private async waitForConfirmations(event: Event): Promise<void> {
    // `tx.wait(n)` resolves after n blocks are mined that include the given transaction `tx`
    // See https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse
    await (await event.getTransaction()).wait(this.blockConfirmations + 1);
    this.logger.debug(
      {tx: event.transactionHash},
      'Finished waiting for confirmations; considering transaction finalized'
    );
  }

  private addAssetHolderObservable(assetHolderContract: Contract): Observable<AssetHolderEvent> {
    // Create an observable that emits events on contract events
    const obs = new Observable<AssetHolderEvent>(subs => {
      // TODO: add other event types
      assetHolderContract.on(
        Deposited,
        (destination, _amountDeposited, destinationHoldings, event) =>
          subs.next({
            type: Deposited,
            channelId: destination,
            assetHolderAddress: makeAddress(assetHolderContract.address),
            amount: BN.from(destinationHoldings),
            ethersEvent: event,
          })
      );
      assetHolderContract.on(AssetTransferred, (channelId, destination, payoutAmount, event) =>
        subs.next({
          type: AssetTransferred,
          channelId,
          assetHolderAddress: makeAddress(assetHolderContract.address),
          to: makeDestination(destination),
          amount: BN.from(payoutAmount),
          ethersEvent: event,
        })
      );
    });
    obs.subscribe({
      next: async event => {
        this.logger.debug(
          {channelId: event.channelId, tx: event.ethersEvent?.transactionHash},
          `Observed ${event.type} event on-chain; beginning to wait for confirmations`
        );
        await this.waitForConfirmations(event.ethersEvent);
        this.channelToSubscriber.get(event.channelId)?.forEach(subscriber => {
          switch (event.type) {
            case Deposited:
              subscriber.holdingUpdated(event);
              break;
            case AssetTransferred:
              subscriber.assetTransferred(event);
              break;
            default:
              throw new Error('Unexpected event from contract observable');
          }
        });
      },
    });

    return obs;
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

        const tx = await this.sendTransaction(increaseAllowanceRequest);

        this.logger.info(
          {tx: tx.hash},
          'Transaction to increase asset holder token allowance successfully submitted'
        );

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

          const tx = await this.sendTransaction(approveAllowanceRequest);

          this.logger.info(
            {tx: tx.hash},
            'Transaction to approve maximum amount of asset holder spending successfully submitted'
          );

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
