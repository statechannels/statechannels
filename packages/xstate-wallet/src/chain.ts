import {ContractArtifacts, createETHDepositTransaction} from '@statechannels/nitro-protocol';
import {getProvider} from './utils/contract-utils';
import {ethers} from 'ethers';
import {ETH_ASSET_HOLDER_ADDRESS} from './constants';
import {BigNumber, bigNumberify} from 'ethers/utils';
import {State} from './store/types';
import {Observable, fromEvent, from, concat} from 'rxjs';
import {filter, map} from 'rxjs/operators';

const EthAssetHolderInterface = new ethers.utils.Interface(
  // @ts-ignore https://github.com/ethers-io/ethers.js/issues/602#issuecomment-574671078
  ContractArtifacts.Erc20AssetHolderArtifact.abi
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
  private _contract: ethers.Contract | undefined;
  public async initialize() {
    const provider = getProvider();
    const signer = provider.getSigner();
    this._contract = new ethers.Contract(ETH_ASSET_HOLDER_ADDRESS, EthAssetHolderInterface, signer);
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
    if (!this._contract) {
      throw new Error('Not connected to contract');
    }

    const first = from(this.getChainInfo(channelId));

    const updates = fromEvent(this._contract, 'DEPOSITED').pipe(
      filter((event: {toAddress: string; amount: BigNumber}) => {
        return event.toAddress === channelId;
      }),
      map(event => {
        return {amount: event.amount, finalized: false};
      })
    );
    return concat(first, updates);
  }
}
