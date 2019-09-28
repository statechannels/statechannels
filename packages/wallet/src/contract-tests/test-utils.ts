import { ethers } from "ethers";
import { CommitmentType, Commitment, signCommitment2 } from "../domain";
import {
  createDepositTransaction,
  createForceMoveTransaction,
  createConcludeTransaction,
  createRefuteTransaction,
  createRespondWithMoveTransaction,
} from "../utils/transaction-generator";
import { signCommitment } from "../domain";
import loadJsonFile from "load-json-file";
import path from "path";

// TODO: Make sure this import works in the scenario where build/contracts is empty
// so that the webpack and tsc build for  @statechannels/wallet still passes
import TrivialAppArtifact from "../../build/contracts/TrivialApp.json";
import { bigNumberify } from "ethers/utils";
import { channelID, Channel } from "fmg-core/lib/channel";
import { ADJUDICATOR_ADDRESS, ETH_ASSET_HOLDER_ADDRESS } from "../constants";
import { ADDRESS_ZERO } from "fmg-core";
import { JsonRpcProvider, TransactionRequest } from "ethers/providers";

let networkMap;
export async function getLibraryAddress(networkId) {
  networkMap = networkMap || (await getNetworkMap());
  if (networkMap[networkId] && networkMap[networkId][TrivialAppArtifact.contractName]) {
    return networkMap[networkId][TrivialAppArtifact.contractName];
  }
  console.error(networkId, networkMap);

  throw new Error("Library missing");
}
export const fiveFive = [bigNumberify(5).toHexString(), bigNumberify(5).toHexString()] as [string, string];
export const fourSix = [bigNumberify(4).toHexString(), bigNumberify(6).toHexString()] as [string, string];

export const defaultDepositAmount = fiveFive[0];

export const getNetworkMap = async () => {
  try {
    return await loadJsonFile(path.join(__dirname, "../../deployment/network-map.json"));
  } catch (err) {
    if (!!err.message.match("ENOENT: no such file or directory")) {
      return {};
    } else {
      throw err;
    }
  }
};

export async function getChannelId(provider, channelNonce, participantA, participantB) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = await getLibraryAddress(networkId);
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
  const libraryAddress = await getLibraryAddress(networkId);
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
    commitmentType: CommitmentType.App,
    appAttributes: "0x00",
    commitmentCount: 0,
  };

  const toCommitment: Commitment = {
    channel,
    allocation: fiveFive,
    destination: [participantA.address, participantB.address],
    turnNum: 7,
    commitmentType: CommitmentType.App,
    appAttributes: "0x00",
    commitmentCount: 0,
  };

  const challengeTransaction = createForceMoveTransaction(
    signCommitment2(fromCommitment, participantA.privateKey),
    signCommitment2(toCommitment, participantB.privateKey),
    participantA.privateKey
  );
  const transactionReceipt = await sendTransaction(provider, challengeTransaction);
  await transactionReceipt.wait();
  return toCommitment;
}

export async function concludeGame(provider: ethers.providers.JsonRpcProvider, channelNonce, participantA, participantB) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = await getLibraryAddress(networkId);
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
    appAttributes: "0x00",
    commitmentCount: 0,
  };

  const toCommitment: Commitment = {
    channel,
    allocation: fiveFive,
    destination: [participantA.address, participantB.address],
    turnNum: 6,
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

export async function respondWithMove(provider: ethers.providers.JsonRpcProvider, channelNonce, participantA, participantB) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = await getLibraryAddress(networkId);
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
    appAttributes: "0x00",
    commitmentCount: 1,
  };

  const toSig = signCommitment(toCommitment, participantB.privateKey);

  const respondWithMoveTransaction = createRespondWithMoveTransaction(toCommitment, participantB.privateKey);
  const transactionReceipt = await sendTransaction(provider, respondWithMoveTransaction);
  await transactionReceipt.wait();
  return { toCommitment, toSig };
}

export async function refuteChallenge(provider: ethers.providers.JsonRpcProvider, channelNonce, participantA, participantB) {
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = await getLibraryAddress(networkId);
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
    appAttributes: "0x00",
    commitmentCount: 1,
  };

  const toSig = signCommitment(toCommitment, participantA.privateKey);
  const refuteTransaction = createRefuteTransaction(toCommitment, toSig);
  const transactionReceipt = await sendTransaction(provider, refuteTransaction);
  await transactionReceipt.wait();
  return toCommitment;
}

async function sendTransaction(provider: JsonRpcProvider, tx: TransactionRequest) {
  const signer = await provider.getSigner();
  return await signer.sendTransaction({ to: ADJUDICATOR_ADDRESS, ...tx });
}
