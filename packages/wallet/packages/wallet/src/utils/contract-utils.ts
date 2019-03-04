import { ethers } from 'ethers';

import NitroAdjudicatorArtifact from '../../build/contracts/NitroAdjudicator.json';

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

export async function getAdjudicatorContractAddress(provider) {
  await provider.ready;
  const networkId = (await provider.getNetwork()).chainId;
  return NitroAdjudicatorArtifact.networks[networkId].address;
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
