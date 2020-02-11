import {ContractArtifacts, createETHDepositTransaction} from '@statechannels/nitro-protocol';
import {getProvider} from './utils/contract-utils';
import {ethers} from 'ethers';
import {BigNumber, bigNumberify} from 'ethers/utils';
import {State} from './store/types';
import {Observable, fromEvent, from, concat} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {ETH_ASSET_HOLDER_ADDRESS, NITRO_ADJUDICATOR_ADDRESS} from './constants';
import {ChainEventType, ChainEventListener, ChainEvent} from '@statechannels/wallet-protocols';

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
}

// TODO: This chain should be fleshed out enough so it mimics basic chain behavior
export class FakeChain implements Chain {
  public async initialize() {
    /* NOOP */
  }
  public async deposit(channelId: string, expectedHeld: string, amount: string): Promise<void> {
    /*TODO: record the amount */
  }
  public async getChainInfo(channelId: string): Promise<ChannelChainInfo> {
    // TODO: Get the recorded amount
    return {amount: bigNumberify(0), finalized: false};
  }
  public chainUpdatedFeed(channelId: string): Observable<ChannelChainInfo> {
    // TODO: Get the recorded amount
    return Observable.create({
      amount: bigNumberify(0),
      finalized: false
    });
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

    const updates = fromEvent(this._assetHolders[0], 'DEPOSITED').pipe(
      filter((event: {toAddress: string; amount: BigNumber}) => {
        return event.toAddress === channelId;
      }),
      map(event => {
        return {amount: event.amount, finalized: false};
      })
    );
    return concat(first, updates);
  }
  // TOFO remove 'on'
  public on(eventType: ChainEventType, listener: ChainEventListener) {
    if (eventType !== 'DEPOSITED') {
      throw new Error(`No support for ${eventType}`);
    }
    if (!this._adjudicator) {
      throw new Error('Chain must be initialized before being used');
    } else {
      const contractListener = (fromAddress, toAddress, value, event) => {
        const chainEvent: ChainEvent = {
          type: 'DEPOSITED',
          channelId: event.args.destination,
          amount: event.args.amountDeposited,
          total: event.args.destinationHoldings
        };
        listener(chainEvent);
      };
      this._assetHolders[0].on('Deposited', contractListener);
      return () => {
        this._assetHolders[0]?.removeListener('Deposited', contractListener);
      };
    }
  }
  public fundingFeed(channelId: string): Observable<any> {
    const assetHolder = this._assetHolders[0];
    const observable = Observable.create(function(observer) {
      const contractListener = (fromAddress, toAddress, value, event) => {
        const chainEvent: ChainEvent = {
          type: 'DEPOSITED',
          channelId: event.args.destination,
          amount: event.args.amountDeposited,
          total: event.args.destinationHoldings
        };
        if (event.args.destination === channelId) {
          observer.next(chainEvent);
        }
      };
      assetHolder.on('Deposited', contractListener);
    });
    return observable;
  }

  // public watchAdjudicator(channelId: string); // TODO
  // public watchAssetHolder(asset: string, channelId: string); // TODO
  // public fundingRevertedFeed // TODO
  // public challengeFeed; // TODO
}
