import { ethers } from 'ethers';
import { CommitmentType, Commitment } from '../domain';
import {
  createDepositTransaction,
  createForceMoveTransaction,
  createConcludeTransaction,
  createRefuteTransaction,
  createRespondWithMoveTransaction,
} from '../utils/transaction-generator';
import { signCommitment } from '../domain';
import testGameArtifact from '../../build/contracts/TestGame.json';
import { bigNumberify } from 'ethers/utils';
import { channelID, Channel } from 'fmg-core/lib/channel';
import { ADJUDICATOR_ADDRESS } from '../constants';
import { ADDRESS_ZERO } from 'fmg-core';
export function getLibraryAddress(networkId) {
  return testGameArtifact.networks[networkId].address;
}
export const fiveFive = [bigNumberify(5).toHexString(), bigNumberify(5).toHexString()] as [
  string,
  string
];
export const fourSix = [bigNumberify(4).toHexString(), bigNumberify(6).toHexString()] as [
  string,
  string
];

export const defaultDepositAmount = fiveFive[0];

export async function getChannelId(provider, channelNonce, participantA, participantB) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = getLibraryAddress(networkId);
  return channelID({
    channelType: libraryAddress,
    nonce: channelNonce,
    participants: [participantA.address, participantB.address],
  });
}

export async function depositContract(
  provider: ethers.providers.JsonRpcProvider,
  participant: string,
  amount = defaultDepositAmount,
) {
  const deployTransaction = createDepositTransaction(participant, amount, '0x0');
  const transactionReceipt = await sendTransaction(provider, deployTransaction);
  await transactionReceipt.wait();
}

export async function createChallenge(
  provider: ethers.providers.JsonRpcProvider,
  channelNonce,
  participantA,
  participantB,
) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = getLibraryAddress(networkId);
  const channel: Channel = {
    channelType: libraryAddress,
    nonce: channelNonce,
    participants: [participantA.address, participantB.address],
    guaranteedChannel: ADDRESS_ZERO,
  };

  const fromCommitment: Commitment = {
    channel,
    allocation: fiveFive,
    destination: [participantA.address, participantB.address],
    turnNum: 5,
    commitmentType: CommitmentType.App,
    appAttributes: '0x00',
    commitmentCount: 0,
  };

  const toCommitment: Commitment = {
    channel,
    allocation: fiveFive,
    destination: [participantA.address, participantB.address],
    turnNum: 6,
    commitmentType: CommitmentType.App,
    appAttributes: '0x00',
    commitmentCount: 0,
  };

  const challengeTransaction = createForceMoveTransaction(
    fromCommitment,
    toCommitment,
    participantA.privateKey,
    participantB.privateKey,
  );
  const transactionReceipt = await sendTransaction(provider, challengeTransaction);
  await transactionReceipt.wait();
  return toCommitment;
}

export async function concludeGame(
  provider: ethers.providers.JsonRpcProvider,
  channelNonce,
  participantA,
  participantB,
) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = getLibraryAddress(networkId);
  const channel: Channel = {
    channelType: libraryAddress,
    nonce: channelNonce,
    participants: [participantA.address, participantB.address],
    guaranteedChannel: ADDRESS_ZERO,
  };

  const fromCommitment: Commitment = {
    channel,
    allocation: fiveFive,
    destination: [participantA.address, participantB.address],
    turnNum: 5,
    commitmentType: CommitmentType.Conclude,
    appAttributes: '0x00',
    commitmentCount: 0,
  };

  const toCommitment: Commitment = {
    channel,
    allocation: fiveFive,
    destination: [participantA.address, participantB.address],
    turnNum: 6,
    commitmentType: CommitmentType.Conclude,
    appAttributes: '0x00',
    commitmentCount: 0,
  };

  const fromSignature = signCommitment(fromCommitment, participantA.privateKey);
  const toSignature = signCommitment(toCommitment, participantB.privateKey);

  const concludeTransaction = createConcludeTransaction(
    fromCommitment,
    toCommitment,
    fromSignature,
    toSignature,
  );
  const transactionReceipt = await sendTransaction(provider, concludeTransaction);
  await transactionReceipt.wait();
}

export async function respondWithMove(
  provider: ethers.providers.JsonRpcProvider,
  channelNonce,
  participantA,
  participantB,
) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = getLibraryAddress(networkId);
  const channel: Channel = {
    channelType: libraryAddress,
    nonce: channelNonce,
    participants: [participantA.address, participantB.address],
    guaranteedChannel: ADDRESS_ZERO,
  };

  const toCommitment: Commitment = {
    channel,
    allocation: fiveFive,
    destination: [participantA.address, participantB.address],
    turnNum: 7,
    commitmentType: CommitmentType.App,
    appAttributes: '0x00',
    commitmentCount: 1,
  };

  const toSig = signCommitment(toCommitment, participantB.privateKey);

  const respondWithMoveTransaction = createRespondWithMoveTransaction(toCommitment, toSig);
  const transactionReceipt = await sendTransaction(provider, respondWithMoveTransaction);
  await transactionReceipt.wait();
  return { toCommitment, toSig };
}

export async function refuteChallenge(
  provider: ethers.providers.JsonRpcProvider,
  channelNonce,
  participantA,
  participantB,
) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = getLibraryAddress(networkId);
  const channel: Channel = {
    channelType: libraryAddress,
    nonce: channelNonce,
    participants: [participantA.address, participantB.address],
    guaranteedChannel: ADDRESS_ZERO,
  };

  const toCommitment: Commitment = {
    channel,
    allocation: fiveFive,
    destination: [participantA.address, participantB.address],
    turnNum: 8,
    commitmentType: CommitmentType.App,
    appAttributes: '0x00',
    commitmentCount: 1,
  };

  const toSig = signCommitment(toCommitment, participantA.privateKey);
  const refuteTransaction = createRefuteTransaction(toCommitment, toSig);
  const transactionReceipt = await sendTransaction(provider, refuteTransaction);
  await transactionReceipt.wait();
  return toCommitment;
}

async function sendTransaction(provider, tx) {
  const signer = provider.getSigner();
  return await signer.sendTransaction({ ...tx, to: ADJUDICATOR_ADDRESS });
}
