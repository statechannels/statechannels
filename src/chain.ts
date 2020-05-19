import {
  ContractArtifacts,
  createETHDepositTransaction,
  Transactions,
  getChallengeRegisteredEvent,
  ChallengeRegisteredEvent,
  SignedState as NitroSignedState
} from '@statechannels/nitro-protocol';
import {Contract, Wallet} from 'ethers';
import {Zero, One} from 'ethers/constants';
import {Interface, BigNumber, bigNumberify, hexZeroPad, BigNumberish} from 'ethers/utils';
import {Observable, fromEvent, from, merge} from 'rxjs';
import {filter, map, flatMap} from 'rxjs/operators';

import EventEmitter from 'eventemitter3';

import {fromNitroState, toNitroSignedState, calculateChannelId} from './store/state-utils';

import {getProvider} from './utils/contract-utils';
import {State, SignedState} from './store/types';
import {ETH_ASSET_HOLDER_ADDRESS, NITRO_ADJUDICATOR_ADDRESS} from './config';
import {logger} from './logger';

const EthAssetHolderInterface = new Interface(
  // https://github.com/ethers-io/ethers.js/issues/602#issuecomment-574671078
  ContractArtifacts.EthAssetHolderArtifact.abi
);

const NitroAdjudicatorInterface = new Interface(ContractArtifacts.NitroAdjudicatorArtifact.abi);

export interface ChannelChainInfo {
  readonly amount: BigNumber;
  readonly channelStorage: {
    turnNumRecord: BigNumber;
    finalizesAt: BigNumber;
    /* fingerprint: string */
  };
  readonly finalized: boolean; // this is a check on 0 < finalizesAt <= now
  readonly blockNum: BigNumber; // blockNum that the information is from
}

export interface Chain {
  // Properties
  ethereumIsEnabled: boolean;
  selectedAddress: string | null;

  // Feeds
  chainUpdatedFeed: (channelId: string) => Observable<ChannelChainInfo>;
  challengeRegisteredFeed: (channelId: string) => Observable<ChallengeRegistered>;

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
    this.blockNumber = bigNumberify(blockNumber);

    for (const channelId in this.channelStatus) {
      const {
        channelStorage: {finalizesAt}
      } = this.channelStatus[channelId];
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
      channelStorage: {
        turnNumRecord: turnNum,
        finalizesAt: this.blockNumber.add(challengeDuration)
      },
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
      channelStorage: {
        turnNumRecord: turnNum,
        finalizesAt: this.blockNumber
      }
    };
  }

  public depositSync(channelId: string, expectedHeld: string, amount: string) {
    const current = (this.channelStatus[channelId] || {}).amount || bigNumberify(0);

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
    const {amount, channelStorage} = this.channelStatus[channelId] || {};
    return {
      channelStorage: channelStorage || {
        turnNumRecord: Zero,
        finalizesAt: Zero
      },
      finalized:
        channelStorage &&
        channelStorage.finalizesAt.gt(0) &&
        channelStorage.finalizesAt.lte(this.blockNumber),
      blockNum: this.blockNumber,
      amount: amount || Zero
    };
  }

  public chainUpdatedFeed(channelId: string): Observable<ChannelChainInfo> {
    const first = from(this.getChainInfo(channelId));

    const updates = fromEvent(this.eventEmitter, 'updated').pipe(
      filter((event: Updated) => event.channelId === channelId),
      map(({amount, channelStorage, finalized, blockNum: blockNum}) => ({
        amount,
        channelStorage,
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
      new Contract(ETH_ASSET_HOLDER_ADDRESS, EthAssetHolderInterface, this.signer)
    ]; // TODO allow for other asset holders, for now we use slot 0 only
    this._assetHolders[0].on('Deposited', (...event) =>
      chainLogger.info({...event}, 'Deposited event')
    );
    this._adjudicator = new Contract(
      NITRO_ADJUDICATOR_ADDRESS,
      NitroAdjudicatorInterface,
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
    return bigNumberify(await this.provider.getBlockNumber());
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

    const response = await this.signer.sendTransaction(transactionRequest);
    return response.hash;
  }

  public async challenge(support: SignedState[], privateKey: string): Promise<string | undefined> {
    const convertedSignedStates = support.reduce(
      (previous, current) => previous.concat(toNitroSignedState(current)),
      new Array<NitroSignedState>()
    );
    console.log(convertedSignedStates);
    const response = await this.signer.sendTransaction({
      ...Transactions.createForceMoveTransaction(
        convertedSignedStates,
        // createForceMoveTransaction requires this to sign a "challenge message"
        privateKey
      ),
      to: NITRO_ADJUDICATOR_ADDRESS
    });
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
    const response = await this.signer.sendTransaction(transactionRequest);
    chainLogger.info({response}, 'Deposit successful from %s', response.from);
    return response.hash;
  }

  public async getChainInfo(channelId: string): Promise<ChannelChainInfo> {
    const ethAssetHolder = new Contract(
      ETH_ASSET_HOLDER_ADDRESS,
      EthAssetHolderInterface,
      this.provider
    );

    const nitroAdjudicator = new Contract(
      NITRO_ADJUDICATOR_ADDRESS,
      NitroAdjudicatorInterface,
      this.provider
    );

    const amount: BigNumber = await ethAssetHolder.holdings(channelId);

    const result = await nitroAdjudicator.getData(channelId);

    const [turnNumRecord, finalizesAt] = result.map(bigNumberify);

    const blockNum = bigNumberify(await this.provider.getBlockNumber());

    // TODO: Fetch other info
    return {
      amount,
      channelStorage: {
        turnNumRecord,
        finalizesAt
      },
      finalized: finalizesAt.gt(0) && finalizesAt.lte(blockNum),
      blockNum
    };
  }

  public chainUpdatedFeed(channelId: string): Observable<ChannelChainInfo> {
    if (!this._assetHolders || !this._assetHolders[0] || !this._adjudicator) {
      throw new Error('Not connected to contracts');
    }

    const first = from(this.getChainInfo(channelId));

    const depositEvents = fromEvent(this._assetHolders[0], 'Deposited').pipe(
      // TODO: Type event correctly, use ethers-utils.js
      filter((event: Array<string | BigNumber>) => event[0] === channelId),
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

  public challengeRegisteredFeed(channelId: string): Observable<ChallengeRegistered> {
    if (!this._adjudicator) {
      throw new Error('Not connected to contracts');
    }

    const updates = fromEvent(this._adjudicator, 'ChallengeRegistered').pipe(
      filter((event: any) => event[0] === channelId), // index 0 of ChallengeRegistered event is channelId
      map(getChallengeRegisteredEvent),
      map(({challengeStates, finalizesAt}: ChallengeRegisteredEvent) => ({
        channelId,
        challengeState: fromNitroState(challengeStates[challengeStates.length - 1].state),
        challengeExpiry: bigNumberify(finalizesAt)
      }))
    );

    return merge(
      /* first */ // TODO: We cannot have a first because we can't "replay" events yet
      updates
    );
  }
}
