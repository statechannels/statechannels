import {Contract} from 'ethers';
import {ContractArtifacts} from '@statechannels/nitro-protocol';

import {ETH_ASSET_HOLDER_ADDRESS, INFURA_API_KEY} from '../config';
import {MOCK_TOKEN, MOCK_ASSET_HOLDER_ADDRESS, ETH_TOKEN} from '../constants';
import {BigNumber, providers} from 'ethers';

let provider: providers.Web3Provider | providers.JsonRpcProvider;

export function assetHolderAddress(tokenAddress: string): string | undefined {
  if (BigNumber.from(tokenAddress).isZero()) return ETH_ASSET_HOLDER_ADDRESS;
  else if (tokenAddress === MOCK_TOKEN) return MOCK_ASSET_HOLDER_ADDRESS;

  throw 'AssetHolderAddress not found';
}

export function tokenAddress(assetHolderAddress: string): string | undefined {
  if (assetHolderAddress === ETH_ASSET_HOLDER_ADDRESS) return ETH_TOKEN;
  else if (assetHolderAddress === MOCK_ASSET_HOLDER_ADDRESS) return MOCK_TOKEN;

  throw 'TokenAddress not found';
}

export function getProvider(): providers.Web3Provider | providers.JsonRpcProvider {
  if (provider) return provider;

  if (window.ethereum) {
    if (window.ethereum.mockingInfuraProvider) {
      provider = new providers.InfuraProvider('ropsten', INFURA_API_KEY);
    } else {
      // https://github.com/ethers-io/ethers.js/issues/861#issuecomment-638031278
      provider = new providers.Web3Provider(window.ethereum, 'any');
      provider.on('network', (_, oldNetwork) => {
        // When a Provider makes its initial connection, it emits a "network"
        // event with a null oldNetwork along with the newNetwork. So, if the
        // oldNetwork exists, it represents a changing network
        if (oldNetwork) {
          //window.location.reload();
        }
      });
    }
  } else {
    provider = new providers.JsonRpcProvider(`http://localhost:${process.env.GANACHE_PORT}`);
  }

  return provider;
}

export function getEthAssetHolderContract() {
  const provider = getProvider();
  return new Contract(
    ETH_ASSET_HOLDER_ADDRESS || '0x0',
    ContractArtifacts.EthAssetHolderArtifact['abi'],
    provider
  );
}
