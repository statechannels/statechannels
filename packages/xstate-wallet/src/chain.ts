import {
  ContractArtifacts,
  createETHDepositTransaction,
  Transactions,
  getChallengeRegisteredEvent,
  ChallengeRegisteredEvent
} from '@statechannels/nitro-protocol';
import {BigNumber, bigNumberify, hexZeroPad} from 'ethers/utils';
import {ethers} from 'ethers';
import {Observable, fromEvent, from, merge} from 'rxjs';
import {filter, map} from 'rxjs/operators';

import EventEmitter = require('eventemitter3');

import {fromNitroState, toNitroSignedState, calculateChannelId} from './store/state-utils';
import {getProvider} from './utils/contract-utils';
import {State, SignedState} from './store/types';
import {ETH_ASSET_HOLDER_ADDRESS, NITRO_ADJUDICATOR_ADDRESS} from './constants';
import {exists} from './utils';
import {Zero} from 'ethers/constants';

const EthAssetHolderInterface = new ethers.utils.Interface(
  // https://github.com/ethers-io/ethers.js/issues/602#issuecomment-574671078
  ContractArtifacts.EthAssetHolderArtifact.abi
);
const NitroAdjudicatorInterface = new ethers.utils.Interface(
  ContractArtifacts.NitroAdjudicatorArtifact.abi
);

export interface ChannelChainInfo {
  readonly challenge?: {state: State; challengeExpiry: BigNumber};
  readonly amount: BigNumber;
  // TODO: This is the same as challengeExpiry < now
  readonly finalized: boolean;
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
  deposit: (channelId: string, expectedHeld: string, amount: string) => Promise<void>;
  challenge: (support: SignedState[], privateKey: string) => Promise<void>;
  finalizeAndWithdraw: (finalizationProof: SignedState[]) => Promise<void>;
  getChainInfo: (channelId: string) => Promise<ChannelChainInfo>;
}

const UPDATED = 'updated';

const CHALLENGE_REGISTERED = 'challengeRegistered';
const CHALLENGE_CLEARED = 'challengeCleared';
const CONCLUDED = 'concluded';

type Updated = ChannelChainInfo & {channelId: string};

type ChallengeRegistered = {channelId: string; challengeState: State; challengeExpiry: BigNumber};
type ChallengeCleared = {channelId: string};
type Concluded = {channelId: string};

export class FakeChain implements Chain {
  private holdings: Record<string, BigNumber> = {};
  private channelStatus: Record<string, ChannelChainInfo> = {};
  private eventEmitter: EventEmitter<{
    // TODO: Remove?
    [UPDATED]: [Updated];
    // TODO: Add AssetHolder events
    [CHALLENGE_REGISTERED]: [ChallengeRegistered];
    [CHALLENGE_CLEARED]: [ChallengeCleared];
    [CONCLUDED]: [Concluded];
  }> = new EventEmitter();

  private fakeSelectedAddress: string;

  public async initialize() {
    /* NOOP */
  }

  public async deposit(channelId: string, expectedHeld: string, amount: string): Promise<void> {
    this.depositSync(channelId, expectedHeld, amount);
  }

  public async challenge(support: SignedState[], privateKey: string): Promise<void> {
    const channelId = calculateChannelId(support[0]);

    this.channelStatus[channelId] = {
      ...(this.channelStatus[channelId] || {}),
      challenge: {
        challengeExpiry: bigNumberify(100),
        state: support[support.length - 1]
      },
      finalized: false
    };

    this.eventEmitter.emit(UPDATED, {
      channelId,
      amount: this.holdings[channelId],
      finalized: false,
      challenge: {
        state: support[support.length - 1],
        challengeExpiry: bigNumberify(100)
      }
    });
  }

  public async finalizeAndWithdraw(finalizationProof: SignedState[]): Promise<void> {
    const channelId = calculateChannelId(finalizationProof[0]);
    this.finalizeSync(channelId);

    this.holdings[channelId] = bigNumberify('0x0');
    this.eventEmitter.emit(UPDATED, {
      ...this.channelStatus[channelId],
      channelId
    });
  }

  public finalizeSync(channelId: string) {
    this.channelStatus[channelId] = {
      ...(this.channelStatus[channelId] || {}),
      finalized: true
    };
  }

  public depositSync(channelId: string, expectedHeld: string, amount: string) {
    const current = this.holdings[channelId] || bigNumberify(0);

    if (current.gte(expectedHeld)) {
      this.holdings[channelId] = current.add(amount);
      this.eventEmitter.emit(UPDATED, {
        ...this.channelStatus[channelId],
        channelId
      });
    }
  }

  public async getChainInfo(channelId: string): Promise<ChannelChainInfo> {
    return (
      this.channelStatus[channelId] || {
        finalized: false,
        amount: Zero
      }
    );
  }

  public chainUpdatedFeed(channelId: string): Observable<ChannelChainInfo> {
    const first = from(this.getChainInfo(channelId));

    const updates = fromEvent(this.eventEmitter, UPDATED).pipe(
      filter((event: Updated) => event.channelId === channelId),
      map(({amount, finalized, challenge}) => ({amount, finalized, challenge}))
    );

    return merge(first, updates);
  }

  public challengeRegisteredFeed(channelId: string): Observable<ChallengeRegistered> {
    const first = from(this.getChainInfo(channelId)).pipe(
      filter(exists),
      filter(({challenge}: ChannelChainInfo) => typeof challenge !== 'undefined'),
      map(({challenge}: ChannelChainInfo) => ({
        channelId,
        // eslint-disable-next-line
        challengeState: challenge!.state,
        // eslint-disable-next-line
        challengeExpiry: challenge!.challengeExpiry
      }))
    );

    const updates = fromEvent(this.eventEmitter, CHALLENGE_REGISTERED).pipe(
      filter((event: ChallengeRegistered) => event.channelId === channelId),
      map(({challengeState, challengeExpiry}) => ({channelId, challengeState, challengeExpiry}))
    );

    return merge(first, updates);
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
  private _adjudicator?: ethers.Contract;
  private _assetHolders: ethers.Contract[];

  public async initialize() {
    const provider = getProvider();
    const signer = provider.getSigner();
    this._assetHolders = [
      new ethers.Contract(ETH_ASSET_HOLDER_ADDRESS, EthAssetHolderInterface, signer)
    ]; // TODO allow for other asset holders, for now we use slot 0 only
    this._adjudicator = new ethers.Contract(
      NITRO_ADJUDICATOR_ADDRESS,
      NitroAdjudicatorInterface,
      signer
    );
  }

  public async ethereumEnable(): Promise<string> {
    if (window.ethereum) {
      const [selectedAddress] = await window.ethereum.enable();
      return selectedAddress;
    } else {
      return Promise.reject('window.ethereum not found');
    }
  }

  public get ethereumIsEnabled(): boolean {
    if (window.ethereum) {
      return !!window.ethereum.selectedAddress;
    } else {
      return false;
    }
  }

  public get selectedAddress(): string | null {
    return (window.ethereum && window.ethereum.selectedAddress) || null;
  }

  public async finalizeAndWithdraw(finalizationProof: SignedState[]): Promise<void> {
    const provider = getProvider();
    const signer = provider.getSigner();
    const transactionRequest = {
      ...Transactions.createConcludePushOutcomeAndTransferAllTransaction(
        finalizationProof.flatMap(toNitroSignedState)
      ),
      to: NITRO_ADJUDICATOR_ADDRESS
    };
    const response = await signer.sendTransaction(transactionRequest);
    await response.wait();
  }

  public async challenge(support: SignedState[], privateKey: string): Promise<void> {
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
    await response.wait();
  }

  public async deposit(channelId: string, expectedHeld: string, amount: string): Promise<void> {
    const provider = getProvider();
    const signer = provider.getSigner();
    const transactionRequest = {
      ...createETHDepositTransaction(channelId, expectedHeld, amount),
      to: ETH_ASSET_HOLDER_ADDRESS,
      value: amount
    };
    const response = await signer.sendTransaction(transactionRequest);
    await response.wait();
  }

  public async getChainInfo(channelId: string): Promise<ChannelChainInfo> {
    const provider = getProvider();
    const contract = new ethers.Contract(
      ETH_ASSET_HOLDER_ADDRESS,
      EthAssetHolderInterface,
      provider
    );
    const amount: ethers.utils.BigNumber = await contract.holdings(channelId);
    // TODO: Fetch other info
    return {
      amount,
      finalized: false
    };
  }

  public chainUpdatedFeed(channelId: string): Observable<ChannelChainInfo> {
    if (!this._assetHolders[0] && !this._adjudicator) {
      throw new Error('Not connected to contracts');
    }

    const first = from(this.getChainInfo(channelId));

    const updates = fromEvent(this._assetHolders[0], 'Deposited').pipe(
      // TODO: Type event correctly, use ethers-utils.js
      filter((event: Array<string | BigNumber>) => event[0] === channelId),
      map((event: Array<string | BigNumber>) => ({
        amount: bigNumberify(event[2]),
        finalized: false
      }))
    );
    return merge(first, updates);
  }

  public challengeRegisteredFeed(channelId: string): Observable<ChallengeRegistered> {
    if (!this._adjudicator) {
      throw new Error('Not connected to contracts');
    }

    const first = from(this.getChainInfo(channelId)).pipe(
      filter(({challenge}: ChannelChainInfo) => typeof challenge !== 'undefined'),
      map(({challenge}: ChannelChainInfo) => ({
        channelId,
        // eslint-disable-next-line
        challengeState: challenge!.state,
        // eslint-disable-next-line
        challengeExpiry: challenge!.challengeExpiry
      }))
    );

    const updates = fromEvent(this._adjudicator, 'ChallengeRegistered').pipe(
      filter((event: any) => event[0] === channelId), // index 0 of ChallengeRegistered event is channelId
      map(getChallengeRegisteredEvent),
      map((event: ChallengeRegisteredEvent) => ({
        channelId,
        challengeState: fromNitroState(
          event.challengeStates[event.challengeStates.length - 1].state
        ),
        challengeExpiry: bigNumberify(event.finalizesAt)
      }))
    );

    return merge(first, updates);
  }
}
