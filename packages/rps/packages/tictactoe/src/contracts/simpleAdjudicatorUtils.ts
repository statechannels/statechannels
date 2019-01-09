import { ethers, utils } from 'ethers';
import simpleAdjudicatorArtifact from '../../contracts/artifacts/SimpleAdjudicator.json';
import detectNetwork from 'web3-detect-network';
import BN from 'bn.js';

export async function deployContract(channelId, amount: BN) {
  const factory = await createFactory();
  const value = utils.bigNumberify(amount.toString());
  const deployedContract = await factory.deploy(channelId, 2, { value });
  // wait for the contract deployment transaction to be mined
  return await deployedContract.deployed();
}
export async function depositFunds(address: string, amount: BN) {
  const depositTransaction = {
    to: address,
    value: utils.bigNumberify(amount.toString()),
  };
  const provider = await getProvider();
  const signer = provider.getSigner();

  return await signer.sendTransaction(depositTransaction);
}

export async function getProvider(): Promise<ethers.providers.Web3Provider> {
  return await new ethers.providers.Web3Provider(web3.currentProvider);
}

export async function createFactory(): Promise<ethers.ContractFactory> {
  const provider = await getProvider();
  return new ethers.ContractFactory(simpleAdjudicatorArtifact.abi, await linkBytecode(simpleAdjudicatorArtifact), provider.getSigner());
}

async function linkBytecode(contractArtifact) {
  const network = await detectNetwork(web3.currentProvider);
  let contractBytecode = contractArtifact.bytecode;
  const links = contractArtifact.networks[network.id].links;
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