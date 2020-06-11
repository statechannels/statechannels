import {JsonRpcProvider} from 'ethers/providers';

const privateKeyWithEth = '0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d';

export function getGanacheProvider() {
  return new JsonRpcProvider(`http://${process.env.GANACHE_HOST}:${process.env.GANACHE_PORT}`);
}

export function getPrivateKeyWithEth() {
  // The following private key is funded with 1 million eth in the startGanache function
  return privateKeyWithEth;
}
export function getWalletWithEthAndProvider() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ethers = require('ethers');
  const ganacheProvider = new ethers.providers.JsonRpcProvider(
    `http://${process.env.GANACHE_HOST}:${process.env.GANACHE_PORT}`
  );
  return new ethers.Wallet(privateKeyWithEth, ganacheProvider);
}
export async function getNetworkId() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ethers = require('ethers');
  const ganacheProvider = new ethers.providers.JsonRpcProvider(
    `http://${process.env.GANACHE_HOST}:${process.env.GANACHE_PORT}`
  );
  return (await ganacheProvider.getNetwork()).chainId;
}

export function getNetworkName(networkId: string | number) {
  switch (Number(networkId)) {
    case 1:
      return 'live';
    case 3:
      return 'ropsten';
    case 4:
      return 'rinkeby';
    case 5:
      return 'goerli';
    case 42:
      return 'kovan';
    default:
      return 'development';
  }
}
