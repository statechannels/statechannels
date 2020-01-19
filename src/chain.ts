import {ContractAbis, createETHDepositTransaction} from '@statechannels/nitro-protocol';
import {getProvider} from './utils/contract-utils';
import {ethers} from 'ethers';
import {ETH_ASSET_HOLDER_ADDRESS} from './constants';
import {IChain, ChainEvent} from '@statechannels/wallet-protocols/src/chain';
import {bigNumberify} from 'ethers/utils';

const EthAssetHolderInterface = new ethers.utils.Interface(ContractAbis.EthAssetHolder);
export class ChainWatcher implements IChain {
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
}

export async function getHoldings(channelId: string): Promise<string> {
  const provider = getProvider();
  const contract = new ethers.Contract(ETH_ASSET_HOLDER_ADDRESS, EthAssetHolderInterface, provider);
  const amount: ethers.utils.BigNumber = await contract.holdings(channelId);
  return amount.toHexString();
}
