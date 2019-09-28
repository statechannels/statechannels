import { ethers } from "ethers";

import { asEthersObject, Commitment } from "fmg-core";
import { AddressZero } from "ethers/constants";
import loadJsonFile = require("load-json-file");
import path from "path";
let networkMap;

export function getLibraryAddress(networkId, contractName) {
  networkMap = networkMap || getNetworkMap();
  if (networkMap[networkId] && networkMap[networkId][contractName]) {
    return networkMap[networkId][contractName];
  }
  console.error(contractName, networkId, networkMap);

  throw new Error(`Could not find ${contractName} in network map with network id ${networkId}`);
}

export const getNetworkMap = () => {
  try {
    return loadJsonFile.sync(path.join(__dirname, "../../deployment/network-map.json"));
  } catch (err) {
    if (!!err.message.match("ENOENT: no such file or directory")) {
      return {};
    } else {
      throw err;
    }
  }
};

export async function getProvider(): Promise<ethers.providers.Web3Provider> {
  return await new ethers.providers.Web3Provider(web3.currentProvider);
}

export async function getAdjudicatorContract(provider) {
  await provider.ready;

  const contractAddress = getLibraryAddress(getNetworkId(), "NitroAdjudicator");
  return new ethers.Contract(contractAddress, getAdjudicatorInterface(), provider);
}

export function getAdjudicatorInterface(): ethers.utils.Interface {
  const NitroAdjudicatorArtifact = require("../../build/contracts/NitroAdjudicator.json");
  return new ethers.utils.Interface(NitroAdjudicatorArtifact.abi);
}

// FIXME: The tests ought to be able to run even without contracts having been built which
// is why this try {} catch {} logic is here, but returning AddressZero is only a way of
// avoiding errors being thrown. The situation is that all tests which actually interact
// with the blockchain are currently skipped, and so the AddressZero value is never used.

export function getETHAssetHolderAddress(): string {
  try {
    return getLibraryAddress(getNetworkId(), "ETHAssetHolder");
  } catch (e) {
    return AddressZero;
  }
}

export function getAdjudicatorContractAddress(): string {
  try {
    return getLibraryAddress(getNetworkId(), "NitroAdjudicator");
  } catch (e) {
    return AddressZero;
  }
}

export function getConsensusContractAddress(): string {
  try {
    return getLibraryAddress(getNetworkId(), "ConsensusApp");
  } catch (e) {
    return AddressZero;
  }
}

export function getNetworkId(): number {
  if (!!process.env.CHAIN_NETWORK_ID) {
    return parseInt(process.env.CHAIN_NETWORK_ID, 10);
  } else {
    throw new Error("There is no target network ID specified.");
  }
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

export async function getAdjudicatorHoldings(provider, channelId) {
  const contract = await getAdjudicatorContract(provider);
  const holdingForChannel = await contract.holdings(channelId);
  return holdingForChannel;
}

export async function getAdjudicatorOutcome(provider, channelId) {
  const contract = await getAdjudicatorContract(provider);
  const outcomeForChannel = await contract.outcomes(channelId);
  return outcomeForChannel;
}

export async function validateTransition(fromCommitment: Commitment, toCommitment: Commitment): Promise<boolean> {
  const provider = await getProvider();
  const contract = await getAdjudicatorContract(provider);
  try {
    return await contract.validTransition(
      asEthersObject(fromCommitment),
      asEthersObject(toCommitment),
      [] // unused argument -- see nitro contract
    );
  } catch (error) {
    if (error.message === "Internal JSON-RPC error.") {
      // Require statements cause a generic JSON-RPC error, so we just catch anything and return false
      return Promise.resolve(false);
    } else {
      throw error;
    }
  }
}
