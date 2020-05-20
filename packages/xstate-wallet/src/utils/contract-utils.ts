import {Contract, providers} from 'ethers';
import {ContractArtifacts} from '@statechannels/nitro-protocol';

import {ETH_ASSET_HOLDER_ADDRESS} from '../config';
import {MOCK_TOKEN, MOCK_ASSET_HOLDER_ADDRESS, ETH_TOKEN} from '../constants';
import {bigNumberify} from 'ethers/utils';

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

export function getProvider(): providers.Web3Provider | providers.JsonRpcProvider {
  if (window.ethereum) {
    return new providers.Web3Provider(window.ethereum);
  } else {
    return new providers.JsonRpcProvider(`http://localhost:${process.env.GANACHE_PORT}`);
  }
}

export function getEthAssetHolderContract() {
  const provider = getProvider();
  return new Contract(
    // eslint-disable-next-line no-process-env
    process.env.ETH_ASSET_HOLDER_ADDRESS || '0x0',
    ContractArtifacts.EthAssetHolderArtifact['abi'],
    provider
  );
}
