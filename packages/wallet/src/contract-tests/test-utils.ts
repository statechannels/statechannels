import {Wallet, Signer} from "ethers";
import {
  createETHDepositTransaction,
  createForceMoveTransaction,
  createConcludeTransaction,
  createRespondTransaction
} from "../utils/transaction-generator";
import * as walletStates from "../redux/state";

import {bigNumberify, BigNumberish} from "ethers/utils";
import {
  ADJUDICATOR_ADDRESS,
  ETH_ASSET_HOLDER_ADDRESS,
  NETWORK_ID,
  CHALLENGE_DURATION
} from "../constants";
import {TransactionRequest, TransactionResponse} from "ethers/providers";
import {getTrivialAppAddress} from "../utils/contract-utils";
import {State, getChannelId as getNitroChannelId, Channel} from "@statechannels/nitro-protocol";
import {Signatures} from "@statechannels/nitro-protocol";
import {convertBalanceToOutcome} from "../redux/__tests__/state-helpers";

export const fiveFive = (asAddress, bsAddress) => [
  {address: asAddress, wei: bigNumberify(5).toHexString()},
  {address: bsAddress, wei: bigNumberify(5).toHexString()}
];

export const defaultDepositAmount = bigNumberify(5).toHexString();

export const createWatcherState = (
  processId: string,
  ...channelIds: string[]
): walletStates.Initialized => {
  const channelSubscriptions: walletStates.ChannelSubscriptions = {};
  for (const channelId of channelIds) {
    channelSubscriptions[channelId] = channelSubscriptions[channelId] || [];
    channelSubscriptions[channelId].push({processId, protocolLocator: []});
  }

  return walletStates.initialized({
    ...walletStates.EMPTY_SHARED_DATA,
    
    processStore: {},
    channelSubscriptions,
    address: "",
    privateKey: ""
  });
};

export async function getChannelId(channelNonce, participantA, participantB) {
  return getNitroChannelId({
    channelNonce,
    chainId: bigNumberify(NETWORK_ID).toHexString(),
    participants: [participantA.address, participantB.address]
  });
}

export async function depositIntoETHAssetHolder(
  signer: Signer,
  participant: string,
  amount = defaultDepositAmount
) {
  const depositTransactionData = createETHDepositTransaction(participant, amount, "0x0");
  const transactionReceipt = await sendTransaction(signer, {
    ...depositTransactionData,
    to: ETH_ASSET_HOLDER_ADDRESS,
    value: amount
  });
  await transactionReceipt.wait();
}

export async function createChallenge(
  signer: Signer,
  channelNonce: BigNumberish,
  participantA,
  participantB
) {
  const libraryAddress = getTrivialAppAddress();

  const channel: Channel = {
    channelNonce: bigNumberify(channelNonce).toHexString(),
    chainId: bigNumberify(NETWORK_ID).toHexString(),
    participants: [participantA.address, participantB.address]
  };

  const fromState: State = {
    channel,
    appDefinition: libraryAddress,
    turnNum: 6,
    outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    appData: "0x00"
  };

  const toState: State = {
    channel,
    appDefinition: libraryAddress,
    turnNum: 7,
    outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    appData: "0x00"
  };

  const challengeTransaction = createForceMoveTransaction(
    Signatures.signState(fromState, participantA.privateKey),
    Signatures.signState(toState, participantB.privateKey),
    participantB.privateKey
  );

  const transactionReceipt = await sendTransaction(signer, challengeTransaction);
  await transactionReceipt.wait();
  return toState;
}

export async function concludeGame(
  signer: Signer,
  channelNonce: BigNumberish,
  participantA: Wallet,
  participantB: Wallet
) {
  const libraryAddress = getTrivialAppAddress();
  const channel: Channel = {
    channelNonce: bigNumberify(channelNonce).toHexString(),
    chainId: bigNumberify(NETWORK_ID).toHexString(),
    participants: [participantA.address, participantB.address]
  };

  const fromState: State = {
    channel,
    appDefinition: libraryAddress,
    turnNum: 6,
    outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
    isFinal: true,
    challengeDuration: CHALLENGE_DURATION,
    appData: "0x00"
  };

  const toState: State = {
    channel,
    appDefinition: libraryAddress,
    turnNum: 7,
    outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
    isFinal: true,
    challengeDuration: CHALLENGE_DURATION,
    appData: "0x00"
  };

  const signedFromState = Signatures.signState(fromState, participantA.privateKey);
  const signedToState = Signatures.signState(toState, participantB.privateKey);

  const concludeTransaction = createConcludeTransaction(signedFromState, signedToState);
  const transactionReceipt = await sendTransaction(signer, concludeTransaction);
  await transactionReceipt.wait();
}

export async function respond(
  signer: Signer,
  channelNonce,
  participantA,
  participantB,
  challenge: State
) {
  const libraryAddress = getTrivialAppAddress();
  const channel: Channel = {
    channelNonce,
    chainId: bigNumberify(NETWORK_ID).toHexString(),
    participants: [participantA.address, participantB.address]
  };

  const toState: State = {
    channel,
    appDefinition: libraryAddress,
    turnNum: 8,
    outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    appData: "0x00"
  };

  const toSignedState = Signatures.signState(toState, participantA.privateKey);

  const respondWithMoveTransaction = createRespondTransaction(challenge, toSignedState);

  const transactionReceipt = await sendTransaction(signer, respondWithMoveTransaction);
  await transactionReceipt.wait();
  return toSignedState;
}

async function sendTransaction(
  signer: Signer,
  tx: TransactionRequest
): Promise<TransactionResponse> {
  return await signer.sendTransaction({to: ADJUDICATOR_ADDRESS, ...tx});
}
