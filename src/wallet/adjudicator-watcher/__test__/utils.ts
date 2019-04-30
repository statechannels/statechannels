import { ethers } from 'ethers';
import { bigNumberify } from 'ethers/utils';
import { Channel } from 'fmg-core';
import * as NitroAdjudicatorArtifact from '../../../contracts/prebuilt_contracts/NitroAdjudicator.json';

const libraryAddress = '0x' + '1'.repeat(40);
const channelNonce = 4;
const asAddress = '0x5409ED021D9299bf6814279A6A1411A7e866A631';
const bsAddress = '0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb';
const participants: [string, string] = [asAddress, bsAddress];
export const channel: Channel = { channelType: libraryAddress, nonce: channelNonce, participants };

// todo: should not hardcode the contract address
const nitroContractAddress = '0x8726C7414ac023D23348326B47AF3205185Fd035';
// const nitroContractAddress = NitroAdjudicatorArtifact.networks[process.env.NETWORK_ID].address;

async function sendTransaction(provider, tx) {
  const signer = provider.getSigner();
  console.log(
    `The contract address is ${NitroAdjudicatorArtifact.networks[process.env.NETWORK_ID].address}`,
  );
  return await signer.sendTransaction({
    ...tx,
    to: nitroContractAddress,
  });
}

function getAdjudicatorInterface(): ethers.utils.Interface {
  return new ethers.utils.Interface(NitroAdjudicatorArtifact.abi);
}

function createDepositTransaction(destination: string, DepositLevel: string) {
  const adjudicatorInterface = getAdjudicatorInterface();
  const data = adjudicatorInterface.functions.deposit.encode([destination]);
  return {
    value: DepositLevel,
    data,
  };
}

export async function depositContract(
  provider: ethers.providers.JsonRpcProvider,
  participant: string,
  amount = bigNumberify(5).toHexString(),
) {
  const deployTransaction = createDepositTransaction(participant, amount);
  const transactionReceipt = await sendTransaction(provider, deployTransaction);
  await transactionReceipt.wait();
}
