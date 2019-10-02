import {configureEnvVariables} from "../config/env.js";
configureEnvVariables();

const privateKeyWithEth = "0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d";

export function getGanacheProvider() {
  const ethers = require("ethers");
  return new ethers.providers.JsonRpcProvider(`http://${process.env.GANACHE_HOST}:${process.env.GANACHE_PORT}`);
}

export function getPrivateKeyWithEth() {
  // the following private key is funded with 1 million eth in the startGanache function
  return privateKeyWithEth;
}
export function getWalletWithEthAndProvider() {
  const ethers = require("ethers");
  const ganacheProvider = new ethers.providers.JsonRpcProvider(
    `http://${process.env.GANACHE_HOST}:${process.env.GANACHE_PORT}`
  );
  return new ethers.Wallet(privateKeyWithEth, ganacheProvider);
}
export async function getNetworkId() {
  const ethers = require("ethers");
  const ganacheProvider = new ethers.providers.JsonRpcProvider(
    `http://${process.env.GANACHE_HOST}:${process.env.GANACHE_PORT}`
  );
  return (await ganacheProvider.getNetwork()).chainId;
}

export function getNetworkName(networkId) {
  switch (networkId) {
    case 1:
      return "live";
    case 3:
      return "ropsten";
    case 4:
      return "rinkeby";
    case 42:
      return "kovan";
    default:
      return "development";
  }
}
