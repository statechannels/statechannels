import { ethers } from "ethers";
import { CommitmentType, Commitment, signCommitment2 } from "../domain";
import {
  createDepositTransaction,
  createForceMoveTransaction,
  createConcludeTransaction,
  createRespondTransaction,
} from "../utils/transaction-generator";
import { signCommitment } from "../domain";
import * as walletStates from "../redux/state";

import { bigNumberify } from "ethers/utils";
import { channelID, Channel } from "fmg-core/lib/channel";
import { ADJUDICATOR_ADDRESS, ETH_ASSET_HOLDER_ADDRESS } from "../constants";
import { ADDRESS_ZERO } from "fmg-core";
import { JsonRpcProvider, TransactionRequest } from "ethers/providers";
import { getLibraryAddress } from "../utils/contract-utils";

export const fiveFive = [bigNumberify(5).toHexString(), bigNumberify(5).toHexString()] as [string, string];
export const fourSix = [bigNumberify(4).toHexString(), bigNumberify(6).toHexString()] as [string, string];

export const defaultDepositAmount = fiveFive[0];

export const createWatcherState = (processId: string, ...channelIds: string[]): walletStates.Initialized => {
  const channelSubscriptions: walletStates.ChannelSubscriptions = {};
  for (const channelId of channelIds) {
    channelSubscriptions[channelId] = channelSubscriptions[channelId] || [];
    channelSubscriptions[channelId].push({processId, protocolLocator: []});
  }

  return walletStates.initialized({
    ...walletStates.EMPTY_SHARED_DATA,
    uid: "",
    processStore: {},
    channelSubscriptions,
    address: "",
    privateKey: ""
  });
};


export async function getChannelId(provider, channelNonce, participantA, participantB) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = await getLibraryAddress(networkId, "TrivialApp");
  return channelID({
    channelType: libraryAddress,
    nonce: channelNonce,
    participants: [participantA.address, participantB.address],
  });
}

export async function depositContract(provider: ethers.providers.JsonRpcProvider, participant: string, amount = defaultDepositAmount) {
  const depositTransactionData = createDepositTransaction(participant, amount, "0x0");
  const transactionReceipt = await sendTransaction(provider, {
    ...depositTransactionData,
    to: ETH_ASSET_HOLDER_ADDRESS,
    value: amount,
  });
  await transactionReceipt.wait();
}

export async function createChallenge(provider: ethers.providers.JsonRpcProvider, channelNonce, participantA, participantB) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = await getLibraryAddress(networkId, "TrivialApp");

  const channel: Channel = {
    channelType: libraryAddress,
    nonce: channelNonce,
    participants: [participantA.address, participantB.address]
  };

  const fromCommitment: Commitment = {
    channel,
    allocation: ["0x05", "0x05"],
    destination: [participantA.address, participantB.address],
    turnNum: 6,
    commitmentType: CommitmentType.App,
    appAttributes: "0x00",
    commitmentCount: 0,
  };

  const toCommitment: Commitment = {
    channel,
    allocation: ["0x05", "0x05"],
    destination: [participantA.address, participantB.address],
    turnNum: 7,
    commitmentType: CommitmentType.App,
    appAttributes: "0x00",
    commitmentCount: 1,
  };

  const challengeTransaction = createForceMoveTransaction(
    signCommitment2(fromCommitment, participantA.privateKey),
    signCommitment2(toCommitment, participantB.privateKey),
    participantB.privateKey
  );

  const transactionReceipt = await sendTransaction(provider, challengeTransaction);
  await transactionReceipt.wait();
  return toCommitment;
}

export async function concludeGame(provider: ethers.providers.JsonRpcProvider, channelNonce, participantA, participantB) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = await getLibraryAddress(networkId, "TrivialApp");
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
    turnNum: 6,
    commitmentType: CommitmentType.Conclude,
    appAttributes: "0x00",
    commitmentCount: 0,
  };

  const toCommitment: Commitment = {
    channel,
    allocation: fiveFive,
    destination: [participantA.address, participantB.address],
    turnNum: 7,
    commitmentType: CommitmentType.Conclude,
    appAttributes: "0x00",
    commitmentCount: 0,
  };

  const signedFromCommitment = signCommitment2(fromCommitment, participantA.privateKey);
  const signedToCommitment = signCommitment2(toCommitment, participantB.privateKey);

  const concludeTransaction = createConcludeTransaction(signedFromCommitment, signedToCommitment);
  const transactionReceipt = await sendTransaction(provider, concludeTransaction);
  await transactionReceipt.wait();
}

export async function respond(provider: ethers.providers.JsonRpcProvider, channelNonce, participantA, participantB, challenge: Commitment) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = await getLibraryAddress(networkId, "TrivialApp");
  const channel: Channel = {
    channelType: libraryAddress,
    nonce: channelNonce,
    participants: [participantA.address, participantB.address],
    guaranteedChannel: ADDRESS_ZERO,
  };

  // TODO: refactor to DRY challenge handling
  const toCommitment: Commitment = {
    channel,
    allocation: fiveFive,
    destination: [participantA.address, participantB.address],
    turnNum: 8,
    commitmentType: CommitmentType.App,
    appAttributes: "0x00",
    commitmentCount: 2,
  };

  const toSig = signCommitment(toCommitment, participantB.privateKey);

  const respondWithMoveTransaction = createRespondTransaction(
    challenge,
    toCommitment,
    participantA.privateKey
  );

  const transactionReceipt = await sendTransaction(provider, respondWithMoveTransaction);
  await transactionReceipt.wait();
  return { toCommitment, toSig };
}

async function sendTransaction(provider: JsonRpcProvider, tx: TransactionRequest) {
  const signer = await provider.getSigner();
  return await signer.sendTransaction({ to: ADJUDICATOR_ADDRESS, ...tx });
}