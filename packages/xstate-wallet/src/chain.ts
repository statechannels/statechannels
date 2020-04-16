import {
  ContractArtifacts,
  createETHDepositTransaction,
  Transactions,
  getChallengeRegisteredEvent,
  ChallengeRegisteredEvent
} from '@statechannels/nitro-protocol';
import {Contract} from 'ethers';
import {Zero, One} from 'ethers/constants';
import {Interface, BigNumber, bigNumberify, hexZeroPad, BigNumberish} from 'ethers/utils';
import {Observable, fromEvent, from, merge} from 'rxjs';
import {filter, map, flatMap} from 'rxjs/operators';

import EventEmitter = require('eventemitter3');

import {fromNitroState, toNitroSignedState, calculateChannelId} from './store/state-utils';
import {getProvider} from './utils/contract-utils';
import {State, SignedState} from './store/types';
import {ETH_ASSET_HOLDER_ADDRESS, NITRO_ADJUDICATOR_ADDRESS} from './constants';

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
    // TODO: Remove?
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

  public async challenge(support: SignedState[], privateKey: string): Promise<string> {
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

export class ChainWatcher implements Chain {
  private _adjudicator?: Contract;
  private _assetHolders: Contract[];
  private mySelectedAddress: string | null;

  public async initialize() {
    const provider = getProvider();
    const signer = provider.getSigner();

    this._assetHolders = [new Contract(ETH_ASSET_HOLDER_ADDRESS, EthAssetHolderInterface, signer)]; // TODO allow for other asset holders, for now we use slot 0 only

    this._adjudicator = new Contract(NITRO_ADJUDICATOR_ADDRESS, NitroAdjudicatorInterface, signer);

    if (this.ethereumIsEnabled) {
      this.mySelectedAddress = window.ethereum.selectedAddress;
    }
  }

  public async getBlockNumber() {
    return bigNumberify(await (await getProvider()).getBlockNumber());
  }

  public async ethereumEnable(): Promise<string> {
    if (window.ethereum) {
      try {
        this.mySelectedAddress = (await window.ethereum.enable())[0];
        if (typeof this.selectedAddress === 'string') {
          return this.selectedAddress;
        } else {
          console.error('Ethereum enabled but no selected address is defined');
          return Promise.reject('Ethereum enabled but no selected address is defined');
        }
      } catch (error) {
        // Handle error. Likely the user rejected the login
        console.error(error);
        return Promise.reject('user rejected in metamask');
      }
    } else {
      return Promise.reject('window.ethereum not found');
    }
  }

  public get selectedAddress(): string | null {
    return this.mySelectedAddress || null;
  }

  public get ethereumIsEnabled(): boolean {
    if (window.ethereum) {
      // window.ethereum.selectedAddress will be null if ethereum has not been enabled
      return !!window.ethereum.selectedAddress;
    } else {
      return false;
    }
  }

  public async finalizeAndWithdraw(finalizationProof: SignedState[]): Promise<string | undefined> {
    const provider = getProvider();
    const signer = provider.getSigner();
    const transactionRequest = {
      ...Transactions.createConcludePushOutcomeAndTransferAllTransaction(
        finalizationProof.flatMap(toNitroSignedState)
      ),
      to: NITRO_ADJUDICATOR_ADDRESS
    };
    const response = await signer.sendTransaction(transactionRequest);
    const transaction = await response.wait();
    return transaction.transactionHash;
  }

  public async challenge(support: SignedState[], privateKey: string): Promise<string | undefined> {
    const provider = getProvider();
    const signer = provider.getSigner();
    const response = await signer.sendTransaction({
      ...Transactions.createForceMoveTransaction(
        // TODO: Code is assuming a doubly-signed state at the moment.
        toNitroSignedState(support[0]),
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
    const provider = getProvider();
    const signer = provider.getSigner();
    const transactionRequest = {
      ...createETHDepositTransaction(channelId, expectedHeld, amount),
      to: ETH_ASSET_HOLDER_ADDRESS,
      value: amount
    };
    const response = await signer.sendTransaction(transactionRequest);
    const transaction = await response.wait();
    return transaction.transactionHash;
  }

  public async getChainInfo(channelId: string): Promise<ChannelChainInfo> {
    const provider = getProvider();
    const ethAssetHolder = new Contract(
      ETH_ASSET_HOLDER_ADDRESS,
      EthAssetHolderInterface,
      provider
    );

    const nitroAdjudicator = new Contract(
      NITRO_ADJUDICATOR_ADDRESS,
      NitroAdjudicatorInterface,
      provider
    );

    const amount: BigNumber = await ethAssetHolder.holdings(channelId);

    const result = await nitroAdjudicator.getData(channelId);

    const [turnNumRecord, finalizesAt] = result.map(bigNumberify);

    const blockNum = bigNumberify(await provider.getBlockNumber());

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
    if (!this._assetHolders[0] && !this._adjudicator) {
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

    // @ts-ignore -- FIXME: ethers events do not have .off for some reason
    const timeoutEvents = fromEvent(this._adjudicator?.provider, 'block').pipe(
      flatMap(async (blockNumber: number) => {
        const chainInfo = await this.getChainInfo(channelId);
        return {blockNumber, chainInfo};
      }),
      filter(
        ({
          blockNumber,
          chainInfo: {
            channelStorage: {finalizesAt}
          }
        }) => finalizesAt.gt(0) && finalizesAt.lte(blockNumber)
      ),
      map(({chainInfo}) => ({channelId, ...chainInfo}))
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
