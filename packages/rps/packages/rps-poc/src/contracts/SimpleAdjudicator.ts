import detectNetwork from 'web3-detect-network';
import contract from 'truffle-contract';
import BN from 'bn.js';
// @ts-ignore
import simpleAdjudicatorArtifact from 'fmg-simple-adjudicator/contracts/SimpleAdjudicator.sol';

import { connectWeb3 } from '../wallet/web3';

export async function deploySimpleAdjudicator({ channelId, amount }: { channelId: string, amount: BN }) {
  const connectedWeb3 = connectWeb3();
  const truffleContract = await setupContract(connectedWeb3);
  /*
  Truffle's contract deployment workflow is not robust enough to deal with
  metamask's fragility, so we manually deploy a contract using web3, grab
  its address, and then instantiate a truffle contract at this address.

  See: https://github.com/magmo/rps-poc/issues/214
  */

  let contractBytecode;
  contractBytecode = truffleContract.bytecode;

  Object.keys(truffleContract.links).forEach(linkName => {
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
      truffleContract.links[linkName].substr(2)
    );
  });

  const web3Contract = new connectedWeb3.eth.Contract(simpleAdjudicatorArtifact.abi, connectedWeb3.eth.defaultAccount);

  const tx = web3Contract.deploy({
    data: contractBytecode,
    arguments: [channelId],
  });

  const deployedContract = await tx.send({ from: connectedWeb3.eth.defaultAccount, value: amount.toString() });

  return await truffleContract.at(deployedContract.options.address);
}

export async function simpleAdjudicatorAt({ address, amount } : { address: string, amount: BN }) {
  const truffleContract = await setupContract(connectWeb3());
  return await truffleContract.at(address, { value: amount.toString() });
}

async function setupContract(connectedWeb3) {
  const simpleAdjudicatorContract = contract(simpleAdjudicatorArtifact);
  simpleAdjudicatorContract.setProvider(connectedWeb3.currentProvider);

  const network = await detectNetwork(web3.currentProvider);
  simpleAdjudicatorContract.setNetwork(network.id);

  await simpleAdjudicatorContract.defaults({ from: connectedWeb3.eth.defaultAccount });
  return simpleAdjudicatorContract;
}