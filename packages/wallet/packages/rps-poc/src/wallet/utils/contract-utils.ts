import { ethers } from 'ethers';
import simpleAdjudicatorArtifact from '../../../build/contracts/SimpleAdjudicator.json';
import rpsGamesArtifact from '../../../build/contracts/RockPaperScissorsGame.json';


export async function getProvider(): Promise<ethers.providers.Web3Provider> {
  return await new ethers.providers.Web3Provider(web3.currentProvider);
}

export async function getAdjudicatorContract(contractAddress: string, provider) {
  return new ethers.Contract(contractAddress, getSimpleAdjudicatorInterface(), provider);
}

export function getSimpleAdjudicatorInterface(): ethers.utils.Interface {
  return new ethers.utils.Interface(simpleAdjudicatorArtifact.abi);
}

export function getSimpleAdjudicatorBytecode(networkId) {
  return linkBytecode(simpleAdjudicatorArtifact, networkId);
}

export function getLibraryAddress(networkId) {
  return rpsGamesArtifact.networks[networkId].address;

}

function linkBytecode(contractArtifact, networkId) {
  let contractBytecode = contractArtifact.bytecode;
  const links = contractArtifact.networks[networkId].links;
  Object.keys(links).forEach(linkName => {
    /*
      `truffle compile` creates bytecode that is not a hex string.
      Instead, the contract itself produces a valid hex string, followed
      by `__${linkName}_________________________________${moreByteCode}`

      We need to replace this stand-in with the address of the deployed
      linked library.
    */
    const replace = `__${linkName}_________________________________`;
    contractBytecode = contractBytecode.replace(
      new RegExp(replace, "g"),
      links[linkName].substr(2)
    );
  });
  return contractBytecode;
}