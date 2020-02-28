import {ContractArtifacts, createETHDepositTransaction} from '@statechannels/nitro-protocol';
import {getProvider} from './utils/contract-utils';
import {ethers} from 'ethers';
import {BigNumber, bigNumberify} from 'ethers/utils';
import {State} from './store/types';
import {Observable, fromEvent, from, concat} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {ETH_ASSET_HOLDER_ADDRESS, NITRO_ADJUDICATOR_ADDRESS} from './constants';
import EventEmitter = require('eventemitter3');

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
  initialize(): Promise<void>;
  getChainInfo: (channelId: string) => Promise<ChannelChainInfo>;
  chainUpdatedFeed: (channelId: string) => Observable<ChannelChainInfo>;
  deposit: (channelId: string, expectedHeld: string, amount: string) => Promise<void>;
  ethereumEnable: () => Promise<void>;
  ethereumIsEnabled: boolean;
  selectedDestination: string;
}

// TODO: This chain should be fleshed out enough so it mimics basic chain behavior
const DEPOSITED = 'deposited';
type Deposited = ChannelChainInfo & {channelId: string};
export class FakeChain implements Chain {
  private holdings: Record<string, BigNumber> = {};
  private finalized: Record<string, boolean | undefined> = {};
  private eventEmitter: EventEmitter<{
    deposited: [Deposited];
  }> = new EventEmitter();
  public async initialize() {
    /* NOOP */
  }

  public async deposit(channelId: string, expectedHeld: string, amount: string): Promise<void> {
    this.depositSync(channelId, expectedHeld, amount);
  }

  public finalizeSync(channelId: string) {
    this.finalized[channelId] = true;
  }

  public depositSync(channelId: string, expectedHeld: string, amount: string) {
    const current = this.holdings[channelId] || bigNumberify(0);

    if (current.gte(expectedHeld)) {
      this.holdings[channelId] = current.add(amount);
      this.eventEmitter.emit(DEPOSITED, {
        amount: this.holdings[channelId],
        finalized: false,
        channelId
      });
    }
  }

  public async getChainInfo(channelId: string): Promise<ChannelChainInfo> {
    return {
      amount: this.holdings[channelId] || bigNumberify(0),
      finalized: this.finalized[channelId] || false
    };
  }

  public chainUpdatedFeed(channelId: string): Observable<ChannelChainInfo> {
    const first = from(this.getChainInfo(channelId));

    const updates = fromEvent(this.eventEmitter, DEPOSITED).pipe(
      filter((event: Deposited) => event.channelId === channelId),
      map(({amount, finalized}) => ({amount, finalized}))
    );

    return concat(first, updates);
  }

  public ethereumEnable() {
    return Promise.resolve();
  }

  public get ethereumIsEnabled() {
    return true;
  }

  public get selectedDestination() {
    return '0x123';
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

  public async ethereumEnable(): Promise<void> {
    if (window.ethereum) {
      return await window.ethereum.enable();
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

  public get selectedDestination(): string {
    if (window.ethereum) {
      const destination = window.ethereum.selectedAddress;
      if (destination) {
        return destination;
      } else {
        throw new Error('window.ethereum is not enabled');
      }
    } else {
      throw new Error('window.ethereum not found');
    }
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
      filter((event: Array<string | BigNumber>) => {
        return event[0] === channelId;
      }),
      map((event: Array<string | BigNumber>) => {
        return {amount: bigNumberify(event[2]), finalized: false};
      })
    );
    return concat(first, updates);
  }
}
