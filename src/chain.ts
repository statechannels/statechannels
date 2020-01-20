import {ContractAbis, createETHDepositTransaction} from '@statechannels/nitro-protocol';
import {getProvider} from './utils/contract-utils';
import {ethers} from 'ethers';
import {ETH_ASSET_HOLDER_ADDRESS} from './constants';
import {
  IChain,
  ChainEvent,
  ChainEventType,
  ChainEventListener
} from '@statechannels/wallet-protocols/src/chain';
import {bigNumberify} from 'ethers/utils';

const EthAssetHolderInterface = new ethers.utils.Interface(ContractAbis.EthAssetHolder);
export class ChainWatcher implements IChain {
  private _contract: ethers.Contract | undefined;
  public async initialize() {
    const provider = getProvider();
    const signer = provider.getSigner();
    this._contract = new ethers.Contract(ETH_ASSET_HOLDER_ADDRESS, EthAssetHolderInterface, signer);
  }
  public async deposit(
    channelId: string,
    expectedHeld: string,
    amount: string
  ): Promise<ChainEvent> {
    const provider = getProvider();
    const signer = provider.getSigner();
    const transactionRequest = {
      ...createETHDepositTransaction(channelId, expectedHeld, amount),
      to: ETH_ASSET_HOLDER_ADDRESS,
      value: amount
    };
    const response = await signer.sendTransaction(transactionRequest);
    await response.wait();
    return {
      type: 'DEPOSITED',
      channelId,
      amount,
      total: bigNumberify(amount)
        .add(expectedHeld)
        .toHexString()
    };
  }
  public async getHoldings(channelId: string): Promise<string> {
    const provider = getProvider();
    const contract = new ethers.Contract(
      ETH_ASSET_HOLDER_ADDRESS,
      EthAssetHolderInterface,
      provider
    );
    const amount: ethers.utils.BigNumber = await contract.holdings(channelId);
    return amount.toHexString();
  }
  public on(eventType: ChainEventType, listener: ChainEventListener) {
    if (eventType !== 'DEPOSITED') {
      throw new Error(`No support for ${eventType}`);
    }
    if (!this._contract) {
      throw new Error('Chain must be initialized before being used');
    } else {
      const contractListener = event => {
        const chainEvent: ChainEvent = {
          type: 'DEPOSITED',
          channelId: event.destination,
          amount: event.amountDeposited,
          total: event.destinationHoldings
        };
        listener(chainEvent);
      };
      this._contract.on('Deposited', contractListener);
      return () => {
        this._contract?.removeListener('Deposited', contractListener);
      };
    }
  }
}

export async function getHoldings(channelId: string): Promise<string> {
  const provider = getProvider();
  const contract = new ethers.Contract(ETH_ASSET_HOLDER_ADDRESS, EthAssetHolderInterface, provider);
  const amount: ethers.utils.BigNumber = await contract.holdings(channelId);
  return amount.toHexString();
}
