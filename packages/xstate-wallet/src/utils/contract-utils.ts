import {Contract} from 'ethers';
import {ContractArtifacts} from '@statechannels/nitro-protocol';

import {ETH_ASSET_HOLDER_ADDRESS, INFURA_API_KEY} from '../config';
import {MOCK_TOKEN, MOCK_ASSET_HOLDER_ADDRESS, ETH_TOKEN} from '../constants';
import {BigNumber, providers} from 'ethers';

let provider: providers.Web3Provider | providers.JsonRpcProvider;
let network: string;

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
    // TODO: Currently disabled due to InfuraProvider not working
    // see  https://github.com/ethers-io/ethers.js/issues/868
    // eslint-disable-next-line no-constant-condition
    if (window.ethereum.mockingInfuraProvider) {
      provider = new providers.InfuraProvider('ropsten', INFURA_API_KEY);
    } else {
      provider = new providers.Web3Provider(window.ethereum);
      // The code below is reloads the page on network change. This is needed due to:
      // - Metamask no longer reloads the page on chain change: https://medium.com/metamask/no-longer-reloading-pages-on-network-change-fbf041942b44
      // - ethers does not have an elegant way to update the provider on network change: https://github.com/MetaMask/metamask-extension/issues/8077#issuecomment-637338683

      // window.ethereum.networkVersion seems to be initialized asynchronously and can be undefined.
      // https://ethereum.stackexchange.com/questions/82994/window-ethereum-networkversion-undefined#comment103120_82995
      network = window.ethereum.networkVersion;
      // The correct event to use is chainChanged: https://docs.metamask.io/guide/ethereum-provider.html#methods-new-api
      // As of Metmask version 7.7.9, this event does not seem to be working.
      // Note about the callback below:
      // - If window.ethereum.networkVersion is undefined, this callback will fire when the networkVersion is initialized.
      // - If window.ethereum.networkVersion is defined, this callback will only fire when the network is changed in Metamask.
      window.ethereum.on('networkChanged', (newNetwork: string) => {
        if (!network) network = newNetwork;
        if (network !== newNetwork) window.location.reload();
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
