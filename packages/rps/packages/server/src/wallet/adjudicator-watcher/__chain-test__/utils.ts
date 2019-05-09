import { ethers } from 'ethers';
import { bigNumberify } from 'ethers/utils';
import { Channel } from 'fmg-core';
import * as contracts from '../../../utilities/contracts';
import { DUMMY_RULES_ADDRESS, FUNDED_CHANNEL_NONCE, PARTICIPANTS } from '../../../constants';

export const channel: Channel = {
  channelType: DUMMY_RULES_ADDRESS,
  nonce: FUNDED_CHANNEL_NONCE,
  participants: PARTICIPANTS,
};

const nitroContractAddress =
  contracts.nitroAdjudicatorArtifact.networks[process.env.NETWORK_ID].address;

async function sendTransaction(provider, tx) {
  const signer = provider.getSigner();
  return await signer.sendTransaction({
    ...tx,
    to: nitroContractAddress,
  });
}

function getAdjudicatorInterface(): ethers.utils.Interface {
  return new ethers.utils.Interface(contracts.nitroAdjudicatorArtifact.abi);
}

function createDepositTransaction(destination: string, DepositLevel: string) {
  const adjudicatorInterface = getAdjudicatorInterface();
  const data = adjudicatorInterface.functions.deposit.encode([destination]);
  return {
    value: DepositLevel,
    data,
  };
}

export async function depositIntoContract(
  provider: ethers.providers.JsonRpcProvider,
  participant: string,
  amount = bigNumberify(5).toHexString(),
) {
  const deployTransaction = createDepositTransaction(participant, amount);
  const transactionReceipt = await sendTransaction(provider, deployTransaction);
  await transactionReceipt.wait();
}
