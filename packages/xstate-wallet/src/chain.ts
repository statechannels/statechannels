/* eslint-disable arrow-body-style */
import {
  ContractArtifacts,
  createETHDepositTransaction,
  Transactions,
  getChallengeRegisteredEvent,
  SignedState as NitroSignedState
} from '@statechannels/nitro-protocol';
import {Contract, Wallet, BigNumber, BigNumberish} from 'ethers';

import {Observable, fromEvent, from, merge, combineLatest} from 'rxjs';
import {
  filter,
  map,
  flatMap,
  defaultIfEmpty,
  mergeMap,
  last,
  switchMap,
  distinctUntilChanged
} from 'rxjs/operators';
import {One, Zero} from '@ethersproject/constants';
import {hexZeroPad} from '@ethersproject/bytes';
import {TransactionRequest} from '@ethersproject/providers';
import EventEmitter from 'eventemitter3';

import {
  fromNitroState,
  toNitroSignedState,
  calculateChannelId,
  toNitroState
} from './store/state-utils';

import {getProvider} from './utils/contract-utils';
import {State, SignedState} from './store/types';
import {ETH_ASSET_HOLDER_ADDRESS, NITRO_ADJUDICATOR_ADDRESS} from './config';
import {logger} from './logger';

export interface ChannelChainInfo extends ChainQueryInfo, ChallengeEventInfo {}

interface ChainQueryInfo {
  readonly amount: BigNumber;
  readonly turnNumRecord: BigNumber;
  readonly finalizesAt: BigNumber;

  readonly finalized: boolean; // this is a check on 0 < finalizesAt <= now
  readonly blockNum: BigNumber; // blockNum that the information is from
}
export interface ChallengeEventInfo {
  readonly finalizesAt: BigNumber;
  readonly challengeState?: State;
  readonly blockNum: BigNumber; // blockNum that the information is from
  readonly finalized: boolean; // this is a check on 0 < finalizesAt <= now
}

export interface Chain {
  // Properties
  ethereumIsEnabled: boolean;
  selectedAddress: string | null;

  // Feeds
  chainUpdatedFeed: (channelId: string) => Observable<ChannelChainInfo>;

  // Setup / Web3 Specific
  ethereumEnable: () => Promise<string>;
  initialize(): Promise<void>;

  // Chain Methods
  getBlockNumber: () => Promise<BigNumber>;
  deposit: (channelId: string, expectedHeld: string, amount: string) => Promise<string | undefined>;
  challenge: (support: SignedState[], privateKey: string) => Promise<string | undefined>;
  finalizeAndWithdraw: (finalizationProof: SignedState[]) => Promise<string | undefined>;
  getChainInfo: (channelId: string) => Promise<ChannelChainInfo>;
}

type Updated = ChannelChainInfo & {channelId: string};

type ChallengeRegistered = {channelId: string; challengeState: State; challengeExpiry: BigNumber};
// type ChallengeCleared = {channelId: string};
// type Concluded = {channelId: string};

export class FakeChain implements Chain {
  private blockNumber: BigNumber = One;
  private channelStatus: Record<string, ChannelChainInfo> = {};
  private eventEmitter: EventEmitter<{
    updated: [Updated];
    // TODO: Add AssetHolder events
    challengeRegistered: [ChallengeRegistered];
    // [CHALLENGE_CLEARED]: [ChallengeCleared];
    // [CONCLUDED]: [Concluded];
  }> = new EventEmitter();

  private fakeSelectedAddress: string;

  public async initialize() {
    /* NOOP */
  }

  public async getBlockNumber() {
    return this.blockNumber;
  }

  public setBlockNumber(blockNumber: BigNumberish) {
    this.blockNumber = BigNumber.from(blockNumber);

    for (const channelId in this.channelStatus) {
      const {finalizesAt} = this.channelStatus[channelId];
      if (finalizesAt.gt(0) && finalizesAt.lte(blockNumber)) {
        this.channelStatus[channelId] = {...this.channelStatus[channelId], finalized: true};
        this.eventEmitter.emit('updated', {channelId, ...this.channelStatus[channelId]});
      }
    }
  }

  public async deposit(channelId: string, expectedHeld: string, amount: string) {
    this.depositSync(channelId, expectedHeld, amount);
    return 'fake-transaction-id';
  }

  public async challenge(support: SignedState[]): Promise<string> {
    const channelId = calculateChannelId(support[0]);

    const {turnNum, challengeDuration} = support[support.length - 1];

    this.channelStatus[channelId] = {
      ...(this.channelStatus[channelId] || {}),
      turnNumRecord: turnNum,
      finalizesAt: this.blockNumber.add(challengeDuration),
      finalized: challengeDuration.eq(0)
    };

    this.eventEmitter.emit('updated', {channelId, ...this.channelStatus[channelId]});

    this.eventEmitter.emit('challengeRegistered', {
      channelId,
      challengeState: support[support.length - 1],
      challengeExpiry: this.blockNumber.add(challengeDuration)
    });

    return 'fake-transaction-id';
  }

  public async finalizeAndWithdraw(finalizationProof: SignedState[]): Promise<string | undefined> {
    const channelId = calculateChannelId(finalizationProof[0]);
    this.finalizeSync(channelId);

    this.channelStatus[channelId] = {
      ...this.channelStatus[channelId],
      amount: Zero,
      blockNum: this.blockNumber
    };

    this.eventEmitter.emit('updated', {
      ...this.channelStatus[channelId],
      channelId,
      blockNum: this.blockNumber
    });
    return;
  }

  public finalizeSync(channelId: string, turnNum: BigNumber = Zero) {
    this.channelStatus[channelId] = {
      ...(this.channelStatus[channelId] || {}),

      turnNumRecord: turnNum,
      finalizesAt: this.blockNumber
    };
  }

  public depositSync(channelId: string, expectedHeld: string, amount: string) {
    const current = (this.channelStatus[channelId] || {}).amount || Zero;

    if (current.gte(expectedHeld)) {
      this.channelStatus[channelId] = {
        ...this.channelStatus[channelId],
        amount: current.add(amount)
      };
      this.eventEmitter.emit('updated', {
        ...this.channelStatus[channelId],
        channelId
      });
    }
  }

  public async getChainInfo(channelId: string): Promise<ChannelChainInfo> {
    const {amount, turnNumRecord, finalizesAt} = this.channelStatus[channelId] || {};
    return {
      turnNumRecord: turnNumRecord || Zero,
      finalizesAt: finalizesAt || Zero,
      finalized: (finalizesAt || Zero).gt(0) && (finalizesAt || Zero).lte(this.blockNumber),
      blockNum: this.blockNumber,
      amount: amount || Zero
    };
  }

  public chainUpdatedFeed(channelId: string): Observable<ChannelChainInfo> {
    const first = from(this.getChainInfo(channelId));

    const updates = fromEvent(this.eventEmitter, 'updated').pipe(
      filter((event: Updated) => event.channelId === channelId),
      map(({amount, finalizesAt, turnNumRecord, finalized, blockNum: blockNum}) => ({
        amount,
        finalizesAt,
        turnNumRecord,
        finalized,
        blockNum
      }))
    );

    return merge(first, updates);
  }

  public challengeRegisteredFeed(channelId: string): Observable<ChallengeRegistered> {
    const updates = fromEvent(this.eventEmitter, 'challengeRegistered').pipe(
      filter((event: ChallengeRegistered) => event.channelId === channelId),
      map(({challengeState, challengeExpiry}) => ({channelId, challengeState, challengeExpiry}))
    );

    return merge(
      /* first */ // TODO: It is not possible to get the "first" event because we have no "replay" functionality
      updates
    );
  }

  public ethereumEnable() {
    this.fakeSelectedAddress = hexZeroPad('0x123', 32);
    return Promise.resolve(this.selectedAddress);
  }

  public get ethereumIsEnabled() {
    return true;
  }

  public get selectedAddress() {
    return this.fakeSelectedAddress;
  }
}

const chainLogger = logger.child({module: 'chain'});

export class ChainWatcher implements Chain {
  private _adjudicator?: Contract;
  private _assetHolders: Contract[];
  private mySelectedAddress: string | null = window.ethereum?.selectedAddress ?? null;
  private provider: ReturnType<typeof getProvider>;
  private get signer() {
    if (!this.ethereumIsEnabled) throw new Error('Ethereum not enabled');

    if (window.ethereum.mockingInfuraProvider) {
      return new Wallet(
        '0xccb052837ccafb700e34c0e0cc0f3e5fbee8f078f3fe6b4e5950c7c8acaa7bce',
        this.provider
      );
    }

    return this.provider.getSigner(this.selectedAddress as string);
  }

  public async initialize() {
    this.provider = getProvider();

    this.provider.on('block', blockNumber => chainLogger.info({blockNumber}, 'New Block'));

    this.configureContracts();
  }

  private configureContracts() {
    if (!this.ethereumIsEnabled) return;

    this._assetHolders = [
      new Contract(
        ETH_ASSET_HOLDER_ADDRESS,
        ContractArtifacts.EthAssetHolderArtifact.abi,
        this.signer
      )
    ];

    this._adjudicator = new Contract(
      NITRO_ADJUDICATOR_ADDRESS,
      ContractArtifacts.NitroAdjudicatorArtifact.abi,
      this.signer
    );

    chainLogger.info(
      {
        ETH_ASSET_HOLDER_ADDRESS,
        NITRO_ADJUDICATOR_ADDRESS,
        numAssetHolders: this._assetHolders.length
      },
      'Contracts configured'
    );
  }

  public async getBlockNumber() {
    return BigNumber.from(await this.provider.getBlockNumber());
  }

  public async ethereumEnable(): Promise<string> {
    if (window.ethereum) {
      try {
        this.mySelectedAddress = (await window.ethereum.enable())[0];
        if (this.ethereumIsEnabled) {
          this.configureContracts();
          return this.selectedAddress as string;
        } else {
          const error = 'Ethereum enabled but no selected address is defined';
          logger.error(error);
          return Promise.reject(error);
        }
      } catch (error) {
        // TODO: Handle error. Likely the user rejected the login
        logger.error(error);
        return Promise.reject('user rejected in metamask');
      }
    } else {
      return Promise.reject('window.ethereum not found');
    }
  }

  public get selectedAddress(): string | null {
    return this.mySelectedAddress;
  }

  public get ethereumIsEnabled(): boolean {
    return typeof this.selectedAddress === 'string';
  }

  public async finalizeAndWithdraw(finalizationProof: SignedState[]): Promise<string | undefined> {
    const transactionRequest = {
      ...Transactions.createConcludePushOutcomeAndTransferAllTransaction(
        finalizationProof.flatMap(toNitroSignedState)
      ),
      to: NITRO_ADJUDICATOR_ADDRESS
    };

    const response = await this.signer.sendTransaction(
      convertNitroTransactionRequest(transactionRequest)
    );
    return response.hash;
  }

  public async challenge(support: SignedState[], privateKey: string): Promise<string | undefined> {
    const convertedSignedStates = support
      .reduce(
        (previous, current) => previous.concat(toNitroSignedState(current)),
        new Array<NitroSignedState>()
      )
      .sort((s1, s2) => s1.state.turnNum - s2.state.turnNum);

    const transactionRequest = {
      ...Transactions.createForceMoveTransaction(
        convertedSignedStates,
        // createForceMoveTransaction requires this to sign a "challenge message"
        privateKey
      ),
      to: NITRO_ADJUDICATOR_ADDRESS
    };

    const response = await this.signer.sendTransaction(
      convertNitroTransactionRequest(transactionRequest)
    );

    const tx = await response.wait();

    return tx.transactionHash;
  }

  public async respondToChallenge(
    challengeState: State,
    responseState: SignedState
  ): Promise<string | undefined> {
    const transactionRequest = {
      ...Transactions.createRespondTransaction(
        toNitroState(challengeState),
        toNitroSignedState(responseState)[0]
      ),
      to: NITRO_ADJUDICATOR_ADDRESS
    };

    const response = await this.signer.sendTransaction(
      convertNitroTransactionRequest(transactionRequest)
    );

    const tx = await response.wait();

    return tx.transactionHash;
  }

  public async deposit(
    channelId: string,
    expectedHeld: string,
    amount: string
  ): Promise<string | undefined> {
    const transactionRequest = {
      ...createETHDepositTransaction(channelId, expectedHeld, amount),
      to: ETH_ASSET_HOLDER_ADDRESS,
      value: amount
    };
    const response = await this.signer.sendTransaction(
      convertNitroTransactionRequest(transactionRequest)
    );
    chainLogger.info({response}, 'Deposit successful from %s', response.from);
    return response.hash;
  }

  public async getChainInfo(channelId: string): Promise<ChannelChainInfo> {
    const ethAssetHolder = new Contract(
      ETH_ASSET_HOLDER_ADDRESS,
      ContractArtifacts.EthAssetHolderArtifact.abi,
      this.provider
    );

    const nitroAdjudicator = new Contract(
      NITRO_ADJUDICATOR_ADDRESS,
      ContractArtifacts.NitroAdjudicatorArtifact.abi,
      this.provider
    );

    const amount: BigNumber = await ethAssetHolder.holdings(channelId);

    const result = await nitroAdjudicator.getData(channelId);

    const [turnNumRecord, finalizesAt] = result.map(BigNumber.from);

    const blockNum = BigNumber.from(await this.provider.getBlockNumber());

    // TODO: Fetch other info
    return {
      amount,

      turnNumRecord,
      finalizesAt,

      finalized: finalizesAt.gt(0) && finalizesAt.lte(blockNum),
      blockNum
    };
  }

  public chainUpdatedFeed(channelId: string): Observable<ChannelChainInfo> {
    return combineLatest(this.chainInfoFeed(channelId), this.challengeStateFeed(channelId)).pipe(
      map(([chainInfo, challengeInfo]) => ({
        ...chainInfo,
        challengeState: chainInfo.finalizesAt.gt(Zero) ? challengeInfo.challengeState : undefined,
        blockNum: chainInfo.blockNum.gt(challengeInfo.blockNum)
          ? chainInfo.blockNum
          : challengeInfo.blockNum,
        finalizesAt: chainInfo.finalizesAt.gt(challengeInfo.finalizesAt)
          ? chainInfo.finalizesAt
          : challengeInfo.finalizesAt
      }))
    );
  }
  private chainInfoFeed(channelId: string): Observable<ChainQueryInfo> {
    if (!this._assetHolders || !this._assetHolders[0] || !this._adjudicator) {
      throw new Error('Not connected to contracts');
    }
    const first = from(this.getChainInfo(channelId));

    const depositEvents = fromEvent(this._assetHolders[0], 'Deposited').pipe(
      // TODO: Type event correctly, use ethers-utils.js
      filter((event: Array<string | BigNumber>) => {
        return event[0] === channelId;
      }),
      // Actually ignores the event data and just polls the chain
      flatMap(async () => this.getChainInfo(channelId))
    );

    const assetTransferEvents = fromEvent(this._assetHolders[0], 'AssetTransferred').pipe(
      // TODO: Type event correctly, use ethers-utils.js
      filter((event: Array<string | BigNumber>) => event[0] === channelId),
      // Actually ignores the event data and just polls the chain
      flatMap(async () => this.getChainInfo(channelId))
    );

    return merge(first, depositEvents, assetTransferEvents);
  }

  private challengeStateFeed(channelId: string): Observable<ChallengeEventInfo> {
    if (!this._adjudicator) {
      throw new Error('Not connected to contracts');
    }

    // Query for all existing Challenge events and get the latest one for the channel
    const first = from(
      Promise.all([
        this._adjudicator.queryFilter(this._adjudicator.filters.ChallengeRegistered(), 0),
        this._adjudicator.queryFilter(this._adjudicator.filters.ChallengeCleared(), 0)
      ])
    ).pipe(
      mergeMap(([e1, e2]) => {
        const events = e1.concat(e2);
        return events.sort((a, b) => a.blockNumber - b.blockNumber);
      }),
      filter(event => (event.args ? event.args[0] : '') === channelId), // The queryFilter returns an event object with an args array

      map(event => {
        if (event.event === 'ChallengeRegistered') {
          const convertedEvent = getChallengeRegisteredEvent([event]);
          const challengeState = fromNitroState(
            convertedEvent.challengeStates[convertedEvent.challengeStates.length - 1].state
          );
          return {
            finalizesAt: BigNumber.from(convertedEvent.finalizesAt),
            challengeState,
            blockNum: BigNumber.from(event.blockNumber)
          };
        } else {
          return {
            finalizesAt: Zero,
            challengeState: undefined,
            blockNum: BigNumber.from(event.blockNumber)
          };
        }
      }),

      defaultIfEmpty({
        finalizesAt: Zero,
        challengeState: undefined,
        blockNum: Zero
      }),
      last()
    );

    const challengeRegisteredUpdates = fromEvent(this._adjudicator, 'ChallengeRegistered').pipe(
      filter((eventArgs: any) => eventArgs[0] === channelId), // The event fired from the contract returns an array with the object event last
      map(event => ({
        ...getChallengeRegisteredEvent(event),
        blockNum: event.slice(-1)[0].blockNumber
      })),
      map(({finalizesAt, challengeStates, blockNum}) => ({
        blockNum: BigNumber.from(blockNum),
        finalizesAt: BigNumber.from(finalizesAt),
        challengeState: fromNitroState(challengeStates[challengeStates.length - 1].state)
      }))
    );

    const challengeClearedUpdates = fromEvent(this._adjudicator, 'ChallengeCleared').pipe(
      filter((eventArgs: any) => eventArgs[0] === channelId), // The event fired from the contract returns an array with the object event last
      map(eventArgs => ({
        finalizesAt: Zero,
        challengeState: undefined,
        blockNum: eventArgs.slice(-1)[0].blockNumber
      }))
    );

    // Fires when a block is mined
    const blockMined = merge(
      from(this.provider.getBlock(this.provider.blockNumber)),
      fromEvent(this.provider, 'block').pipe(
        switchMap(async (b: number) => await this.provider.getBlock(b))
      )
    );

    const challengeEventFeed = merge(first, challengeRegisteredUpdates, challengeClearedUpdates);
    return combineLatest(challengeEventFeed, blockMined).pipe(
      map(([c, b]) => ({
        ...c,
        finalized: BigNumber.from(b.timestamp).gte(c.finalizesAt),
        blockNum: BigNumber.from(b.timestamp).gte(c.finalizesAt)
          ? BigNumber.from(b.number)
          : c.blockNum // Only update the blockNum if the challenge is cleared meaning the challengeEventInfo is updated
      })),
      distinctUntilChanged((c1, c2) => {
        return c1.blockNum.eq(c2.blockNum);
      })
    );
  }
}

// Since nitro-protocol is still using v4 of ethers we need to convert any bignumbers the v5 version from ethers
// TODO: Remove this when nitro protocol is using v5 ethers
function convertNitroTransactionRequest(nitroTransactionRequest): TransactionRequest {
  return {
    ...nitroTransactionRequest,
    gasLimit: nitroTransactionRequest.gasLimit
      ? BigNumber.from(nitroTransactionRequest.gasLimit)
      : undefined,
    gasPrice: nitroTransactionRequest.gasPrice
      ? BigNumber.from(nitroTransactionRequest.gasPrice)
      : undefined,
    nonce: nitroTransactionRequest.nonce
      ? BigNumber.from(nitroTransactionRequest.nonce)
      : undefined,
    value: nitroTransactionRequest.value ? BigNumber.from(nitroTransactionRequest.value) : undefined
  };
}
