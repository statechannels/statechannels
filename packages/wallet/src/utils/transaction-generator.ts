import {TransactionRequest} from "ethers/providers";
import {Commitment, SignedCommitment, signCommitment2} from "../domain";
import {
  createDepositTransaction as createNitroDepositTransaction,
  Transactions as nitroTrans,
  SignedState
} from "@statechannels/nitro-protocol";
import {convertAddressToBytes32, convertCommitmentToState} from "./nitro-converter";

export function createForceMoveTransaction(
  fromCommitment: SignedCommitment,
  toCommitment: SignedCommitment,
  privateKey: string
): TransactionRequest {
  const signedStates = [fromCommitment.signedState, toCommitment.signedState];
  return nitroTrans.createForceMoveTransaction(signedStates, privateKey);
}

export function createRespondTransaction(
  challengeCommitment: Commitment,
  responseCommitment: Commitment,
  privateKey: string
): TransactionRequest {
  const signedState = signCommitment2(responseCommitment, privateKey).signedState;
  return nitroTrans.createRespondTransaction(convertCommitmentToState(challengeCommitment), signedState);
}

export function createRefuteTransaction(seriesOfSupportiveStates: SignedState[]): TransactionRequest {
  return nitroTrans.createCheckpointTransaction(seriesOfSupportiveStates);
}

export function createConcludeTransaction(
  signedFromCommitment: SignedCommitment,
  signedToCommitment: SignedCommitment
): TransactionRequest {
  const signedStates: SignedState[] = [signedFromCommitment.signedState, signedToCommitment.signedState];
  return nitroTrans.createConcludeTransaction(signedStates);
}

export function createDepositTransaction(destination: string, depositAmount: string, expectedHeld: string) {
  return createNitroDepositTransaction(convertAddressToBytes32(destination), expectedHeld, depositAmount);
}
