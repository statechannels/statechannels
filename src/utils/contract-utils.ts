import {Contract} from 'ethers';
import {Web3Provider} from 'ethers/providers';
import {Interface} from 'ethers/utils';
import {ContractArtifacts} from '@statechannels/nitro-protocol';

export function getProvider(): Web3Provider {
  return new Web3Provider(window.web3.currentProvider);
}

export async function getEthAssetHolderContract(provider: Web3Provider) {
  return new Contract(
    process.env.ETH_ASSET_HOLDER_ADDRESS || '0x0',
    getETHAssetHolderInterface(),
    provider
  );
}

export function getETHAssetHolderInterface(): Interface {
  return new Interface(ContractArtifacts.EthAssetHolderArtifact['abi']);
}
