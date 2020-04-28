import {Contract, providers} from 'ethers';
import {Web3Provider, JsonRpcProvider} from 'ethers/providers';
import {Interface, bigNumberify} from 'ethers/utils';
import {ContractArtifacts} from '@statechannels/nitro-protocol';

import {ETH_ASSET_HOLDER_ADDRESS} from '../config';
import {MOCK_TOKEN, MOCK_ASSET_HOLDER_ADDRESS, ETH_TOKEN} from '../constants';

export function assetHolderAddress(tokenAddress: string): string | undefined {
  if (bigNumberify(tokenAddress).isZero()) return ETH_ASSET_HOLDER_ADDRESS;
  else if (tokenAddress === MOCK_TOKEN) return MOCK_ASSET_HOLDER_ADDRESS;

  throw 'AssetHolderAddress not found';
}

export function tokenAddress(assetHolderAddress: string): string | undefined {
  if (assetHolderAddress === ETH_ASSET_HOLDER_ADDRESS) return ETH_TOKEN;
  else if (assetHolderAddress === MOCK_ASSET_HOLDER_ADDRESS) return MOCK_TOKEN;

  throw 'TokenAddress not found';
}

export function getProvider(): Web3Provider | JsonRpcProvider {
  if (window.ethereum) {
    return new Web3Provider(window.ethereum);
  } else {
    return new providers.JsonRpcProvider(`http://localhost:${process.env.GANACHE_PORT}`);
  }
}

export function getEthAssetHolderContract() {
  const provider = getProvider();
  return new Contract(
    process.env.ETH_ASSET_HOLDER_ADDRESS || '0x0',
    getETHAssetHolderInterface(),
    provider
  );
}

export function getETHAssetHolderInterface(): Interface {
  return new Interface(
    // @ts-ignore https://github.com/ethers-io/ethers.js/issues/602#issuecomment-574671078
    ContractArtifacts.EthAssetHolderArtifact['abi']
  );
}
