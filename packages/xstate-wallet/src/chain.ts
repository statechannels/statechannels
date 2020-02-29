import {ContractArtifacts, createETHDepositTransaction} from '@statechannels/nitro-protocol';
import {getProvider} from './utils/contract-utils';
import {ethers} from 'ethers';
import {State, HexNumberString} from './store/types';
import {Observable, fromEvent, from, concat, merge} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {ETH_ASSET_HOLDER_ADDRESS, NITRO_ADJUDICATOR_ADDRESS} from './constants';
import EventEmitter = require('eventemitter3');
import {toHex, add} from './utils/hex-number-utils';
import {BigNumber} from 'ethers/utils';

const EthAssetHolderInterface = new ethers.utils.Interface(
  // https://github.com/ethers-io/ethers.js/issues/602#issuecomment-574671078
  ContractArtifacts.EthAssetHolderArtifact.abi
);
const NitroAdjudicatorInterface = new ethers.utils.Interface(
  ContractArtifacts.NitroAdjudicatorArtifact.abi
);

export interface ChannelChainInfo {
  readonly challenge?: {state: State; challengeExpiry: HexNumberString};
  readonly amount: HexNumberString;
  // TODO: This is the same as challengeExpiry < now
  readonly finalized: boolean;
}

export interface Chain {
  initialize(): Promise<void>;
  getChainInfo: (channelId: string) => Promise<ChannelChainInfo>;
  chainUpdatedFeed: (channelId: string) => Observable<ChannelChainInfo>;
  deposit: (channelId: string, expectedHeld: string, amount: string) => Promise<void>;
}

// TODO: This should handle amounts for each channel
export class FakeChain implements Chain {
  private totalAmount = toHex(0);
  public depositEmitter = new EventEmitter();
  public async initialize() {
    /* NOOP */
  }
  public async deposit(channelId: string, expectedHeld: string, amount: string): Promise<void> {
    this.totalAmount = add(this.totalAmount, amount);
    this.depositEmitter.emit('DEPOSIT', this.totalAmount);
    return Promise.resolve();
  }
  public async getChainInfo(channelId: string): Promise<ChannelChainInfo> {
    return {amount: toHex(this.totalAmount), finalized: false};
  }
  public chainUpdatedFeed(channelId: string): Observable<ChannelChainInfo> {
    const updated = fromEvent<HexNumberString>(this.depositEmitter, 'DEPOSIT').pipe(
      map(a => ({
        amount: a,
        finalized: false
      }))
    );
    const first = from(Promise.resolve({amount: toHex(this.totalAmount), finalized: false}));
    return merge(first, updated);
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
    const amount = toHex(await contract.holdings(channelId));
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
      filter((event: {toAddress: string; amount: BigNumber}) => {
        return event.toAddress === channelId;
      }),
      map(event => {
        return {amount: toHex(event.amount), finalized: false};
      })
    );
    return concat(first, updates);
  }
}
