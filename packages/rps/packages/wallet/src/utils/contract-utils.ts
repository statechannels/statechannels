import { ethers } from 'ethers';

import NitroAdjudicatorArtifact from '../../build/contracts/NitroAdjudicator.json';
import ConsensusAppArtifact from '../../build/contracts/ConsensusApp.json';
import { asEthersObject, Commitment } from 'fmg-core';

export async function getProvider(): Promise<ethers.providers.Web3Provider> {
  return await new ethers.providers.Web3Provider(web3.currentProvider);
}

export async function getAdjudicatorContract(provider) {
  await provider.ready;
  const networkId = (await provider.getNetwork()).chainId;
  const contractAddress = NitroAdjudicatorArtifact.networks[networkId].address;
  return new ethers.Contract(contractAddress, getAdjudicatorInterface(), provider);
}

export function getAdjudicatorInterface(): ethers.utils.Interface {
  return new ethers.utils.Interface(NitroAdjudicatorArtifact.abi);
}

export function getAdjudicatorContractAddress(): string {
  return NitroAdjudicatorArtifact.networks[getNetworkId()].address;
}

export function getConsensusContractAddress(): string {
  return ConsensusAppArtifact.networks[getNetworkId()].address;
}

export function getNetworkId(): number {
  if (!!process.env.CHAIN_NETWORK_ID) {
    return parseInt(process.env.CHAIN_NETWORK_ID, 10);
  } else {
    throw new Error('There is no target network ID specified.');
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

export async function validateTransition(
  fromCommitment: Commitment,
  toCommitment: Commitment,
): Promise<boolean> {
  const provider = await getProvider();
  const contract = await getAdjudicatorContract(provider);
  try {
    return await contract.validTransition(
      asEthersObject(fromCommitment),
      asEthersObject(toCommitment),
      [], // unused argument -- see nitro contract
    );
  } catch (error) {
    if (error.message === 'Internal JSON-RPC error.') {
      // Require statements cause a generic JSON-RPC error, so we just catch anything and return false
      return Promise.resolve(false);
    } else {
      throw error;
    }
  }
}
