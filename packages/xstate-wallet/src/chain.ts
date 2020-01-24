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

const EthAssetHolderInterface = new ethers.utils.Interface(ContractAbis.EthAssetHolder);
export class ChainWatcher implements IChain {
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
      const contractListener = (fromAddress, toAddress, value, event) => {
        const chainEvent: ChainEvent = {
          type: 'DEPOSITED',
          channelId: event.args.destination,
          amount: event.args.amountDeposited,
          total: event.args.destinationHoldings
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
