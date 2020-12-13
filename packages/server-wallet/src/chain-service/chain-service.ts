import {
  ContractArtifacts,
  createERC20DepositTransaction,
  createETHDepositTransaction,
  getChallengeRegisteredEvent,
  getChannelId,
  Transactions,
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
import {Observable} from 'rxjs';
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
  private assetHolderToObservable: Map<Address, Observable<AssetHolderEvent>> = new Map();
  private addressToContract: Map<Address, Contract> = new Map();
  private channelToSubscribers: Map<Bytes32, ChainEventSubscriberInterface[]> = new Map();
  // For convinience, can also use addressToContract map
  private nitroAdjudicator: Contract;

  private readonly blockConfirmations: number;
  private transactionQueue = new PQueue({concurrency: 1});

  private finalizingChannels: {finalizesAtS: number; channelId: Bytes32}[] = [];
  private onBlockCallbackQueue = new PQueue({concurrency: 1});

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

    this.nitroAdjudicator.on(ChallengeRegistered, (...args) => {
      const event = getChallengeRegisteredEvent(args);
      this.addFinalizingChannel(event.channelId, event.finalizesAt);
    });

    this.provider.on('block', async (blockTag: providers.BlockTag) =>
      this.onBlockCallbackQueue.add(async () =>
        this.onBlockMined(await this.provider.getBlock(blockTag))
      )
    );
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
    this.logger.info({...arg}, 'fundChannel: entry');

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

    this.logger.info({channelId}, 'concludeAndWithdraw: entry');

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
    this.logger.info({challengeStates}, 'challenge: entry');
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

  async pushOutcomeAndWithdraw(
    state: State,
    challengerAddress: Address
  ): Promise<providers.TransactionResponse> {
    this.logger.info('pushOutcomeAndWithdraw: entry');
    const lastState = toNitroState(state);
    const channelId = getChannelId(lastState.channel);
    const [
      turnNumRecord,
      finalizesAt,
      _fingerprint,
    ] = await this.nitroAdjudicator.getChannelStorage(channelId);

    const pushTransactionRequest = {
      ...Transactions.createPushOutcomeAndTransferAllTransaction({
        turnNumRecord,
        finalizesAt,
        state: lastState,
        outcome: lastState.outcome,
        challengerAddress,
      }),
      to: nitroAdjudicatorAddress,
    };
    return this.sendTransaction(pushTransactionRequest);
  }

  registerChannel(
    channelId: Bytes32,
    assetHolders: Address[],
    subscriber: ChainEventSubscriberInterface
  ): void {
    this.logger.info({channelId, assetHolders}, 'registerChannel: entry');

    this.channelToSubscribers.set(channelId, [
      ...(this.channelToSubscribers.get(channelId) ?? []),
      subscriber,
    ]);

    assetHolders.map(assetHolder => {
      this.setUpAssetHolderListener(assetHolder);
      const contract = this.getOrAddContractMapping(assetHolder);
      if (!contract) throw new Error('The addressToContract mapping should contain the contract');
      // Fetch the current contract holding, and emit as an event
      this.getInitialHoldings(contract, channelId).then(initialHoldings =>
        subscriber.holdingUpdated(initialHoldings)
      );
    });
  }

  unregisterChannel(channelId: Bytes32): void {
    this.logger.info({channelId}, 'unregisterChannel: entry');
    this.channelToSubscribers.set(channelId, []);
  }

  /**
   * WARNING: potential for a race condition due to:
   * 1. Read class state (this.finalizingChannels)
   * 2. Await a promise (getChannelStorage)
   * 3. Assume that the state in step 1 has not changed.
   *
   * If many onBlockMined are executed in parallel, step 3 assumption does not hold
   * PQueue is used to avoid these race conditions.
   */
  private async onBlockMined(block: providers.Block): Promise<void> {
    if (!this.finalizingChannels.length) return;

    const finalizingChannel = this.finalizingChannels[0];
    if (finalizingChannel.finalizesAtS <= block.timestamp) {
      const {channelId} = finalizingChannel;
      const [, finalizesAt] = await this.nitroAdjudicator.getChannelStorage(channelId);
      if (finalizesAt === finalizingChannel.finalizesAtS) {
        // Should we wait for 6 blocks before emitting the finalized event?
        // Will the wallet sign new states or deposit into the channel based on this event?
        // The answer is likely no.
        // So we probably want to emit this event as soon as possible.
        this.channelToSubscribers.get(channelId)?.map(subscriber =>
          subscriber.channelFinalized({
            channelId,
          })
        );
        // Chain storage has a new finalizesAt timestamp
      } else if (finalizesAt) {
        this.addFinalizingChannel(channelId, finalizesAt);
      }
      this.finalizingChannels = this.finalizingChannels.slice(1);
      this.onBlockCallbackQueue.add(async () => this.onBlockMined(block));
    }
  }

  private addFinalizingChannel(channelId: string, finalizesAtS: number) {
    this.finalizingChannels = [...this.finalizingChannels, {channelId, finalizesAtS: finalizesAtS}];
    this.finalizingChannels.sort((a, b) => a.finalizesAtS - b.finalizesAtS);
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

  private setUpAssetHolderListener(assetHolderAddress: Address): void {
    if (!this.assetHolderToObservable.get(assetHolderAddress)) {
      const contract = this.getOrAddContractMapping(assetHolderAddress);
      const obs = this.addAssetHolderObservable(contract);
      this.assetHolderToObservable.set(assetHolderAddress, obs);
    }
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
        this.channelToSubscribers.get(event.channelId)?.forEach(subscriber => {
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
