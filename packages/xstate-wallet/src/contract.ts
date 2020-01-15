import {ContractAbis, createETHDepositTransaction} from '@statechannels/nitro-protocol';
import {getProvider} from './utils/contract-utils';
import {ethers} from 'ethers';
import {ETH_ASSET_HOLDER_ADDRESS} from './constants';

const EthAssetHolderInterface = new ethers.utils.Interface(ContractAbis.EthAssetHolder);

export async function deposit(
  channelId: string,
  amount: string,
  expectedHeld: string
): Promise<void> {
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

export async function getHoldings(channelId: string): Promise<string> {
  const provider = getProvider();
  const contract = new ethers.Contract(ETH_ASSET_HOLDER_ADDRESS, EthAssetHolderInterface, provider);
  const amount: ethers.utils.BigNumber = await contract.holdings(channelId);
  return amount.toHexString();
}
