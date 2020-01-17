import {Contract, providers} from "ethers";
import log from "loglevel";
import {Interface} from "ethers/utils";
import {ContractArtifacts} from "@statechannels/nitro-protocol";

log.setDefaultLevel(log.levels.DEBUG);

function getContractAddress(name: string): string {
  const address = process.env[name];
  if (address) {
    return address;
  }

  throw new Error(`Could not find ${name} in environment`);
}

export function getProvider(): providers.Web3Provider {
  return new providers.Web3Provider(window.web3.currentProvider);
}

export async function getAdjudicatorContract(provider: providers.Web3Provider) {
  const contractAddress = getAdjudicatorContractAddress();
  return new Contract(contractAddress, getAdjudicatorInterface(), provider);
}

export async function getETHAssetHolderContract(provider: providers.Web3Provider) {
  const contractAddress = getETHAssetHolderAddress();
  return new Contract(contractAddress, getETHAssetHolderInterface(), provider);
}

export async function getERC20AssetHolderContract(provider: providers.Web3Provider) {
  const contractAddress = getERC20AssetHolderAddress();
  return new Contract(contractAddress, getERC20AssetHolderInterface(), provider);
}

export function getAdjudicatorInterface(): Interface {
  return new Interface(ContractArtifacts.NitroAdjudicatorArtifact["abi"]);
}

export function getETHAssetHolderInterface(): Interface {
  return new Interface(ContractArtifacts.EthAssetHolderArtifact["abi"]);
}

export function getERC20AssetHolderInterface(): Interface {
  return new Interface(ContractArtifacts.Erc20AssetHolderArtifact["abi"]);
}

// FIXME: The tests ought to be able to run even without contracts having been built which
// is why this try {} catch {} logic is here, but returning AddressZero is only a way of
// avoiding errors being thrown. The situation is that all tests which actually interact
// with the blockchain are currently skipped, and so the AddressZero value is never used.

export function getTrivialAppAddress(): string {
  return getContractAddress("TRIVIAL_APP_ADDRESS");
}

export function getETHAssetHolderAddress(): string {
  return getContractAddress("ETH_ASSET_HOLDER_ADDRESS");
}

export function getERC20AssetHolderAddress(): string {
  return getContractAddress("TEST_TOKEN_ASSET_HOLDER_ADDRESS");
}

export function getAdjudicatorContractAddress(): string {
  return getContractAddress("NITRO_ADJUDICATOR_ADDRESS");
}

export function getConsensusContractAddress(): string {
  return getContractAddress("CONSENSUS_APP_ADDRESS");
}

export function getNetworkId(): number {
  const id = process.env["CHAIN_NETWORK_ID"];
  if (id) {
    return Number(id);
  }

  throw new Error(`Could not find CHAIN_NETWORK_ID in environment`);
}

export function isDevelopmentNetwork(): boolean {
  const networkId = getNetworkId();

  return (
    networkId > 8 && // various test nets
    networkId !== 42 && // kovan
    networkId !== 60 && // go chain
    networkId !== 77 && // sokol
    networkId !== 99 && // core
    networkId !== 100 && // xDai
    networkId !== 31337 && // go chain test
    networkId !== 401697 && // tobalaba
    networkId !== 7762959 && // musicoin
    networkId !== 61717561 // aquachain
  );
}

export async function getAdjudicatorChannelStorageHash(
  provider: providers.Web3Provider,
  channelId: string
) {
  const contract = await getAdjudicatorContract(provider);
  return await contract.channelStorageHashes(channelId);
}

export async function getETHAssetHolderHoldings(
  provider: providers.Web3Provider,
  channelId: string
) {
  const contract = await getETHAssetHolderContract(provider);
  return await contract.functions.holdings(channelId);
}

export async function getERC20AssetHolderHoldings(
  provider: providers.Web3Provider,
  channelId: string
) {
  const contract = await getERC20AssetHolderContract(provider);
  return await contract.functions.holdings(channelId);
}
