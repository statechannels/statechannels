

import { TransactionRequest } from "ethers/providers";
import { getSimpleAdjudicatorInterface, getSimpleAdjudicatorBytecode } from "./contract-utils";
import { splitSignature } from 'ethers/utils';


export function createForceMoveTransaction(contractAddress: string, fromState: string, toState: string, fromSignature: string, toSignature: string): TransactionRequest {
  const adjudicatorInterface = getSimpleAdjudicatorInterface();
  const splitFromSignature = splitSignature(fromSignature);
  const splitToSignature = splitSignature(toSignature);
  const v = [splitFromSignature.v, splitToSignature.v];
  const r = [splitFromSignature.r, splitToSignature.r];
  const s = [splitFromSignature.s, splitToSignature.s];
  const data = adjudicatorInterface.functions.forceMove.encode([fromState, toState, v, r, s]);

  return {
    to: contractAddress,
    data,
  };
}

export function createRespondWithMoveTransaction(contractAddress: string, nextState: string, signature: string): TransactionRequest {
  const { v, r, s } = splitSignature(signature);
  const adjudicatorInterface = getSimpleAdjudicatorInterface();
  const data = adjudicatorInterface.functions.respondWithMove.encode([nextState, v, r, s]);
  return {
    to: contractAddress,
    data,
  };
}

export function createRefuteTransaction(contractAddress: string, refuteState: string, signature: string): TransactionRequest {
  const adjudicatorInterface = getSimpleAdjudicatorInterface();
  const { v, r, s } = splitSignature(signature);
  const data = adjudicatorInterface.functions.refute.encode([refuteState, v, r, s]);
  return {
    to: contractAddress,
    data,
  };
}

export interface ConcludeAndWithdrawArgs {
  contractAddress: string;
  fromState: string;
  toState: string;
  participant: string;
  destination: string;
  channelId: string;
  fromSignature: string;
  toSignature: string;
  verificationSignature: string;
}
export function createConcludeAndWithdrawTransaction(args: ConcludeAndWithdrawArgs): TransactionRequest {
  const adjudicatorInterface = getSimpleAdjudicatorInterface();
  const splitFromSignature = splitSignature(args.fromSignature);
  const splitToSignature = splitSignature(args.toSignature);
  const splitVerifySignature = splitSignature(args.verificationSignature);

  const v = [splitFromSignature.v, splitToSignature.v, splitVerifySignature.v];
  const r = [splitFromSignature.r, splitToSignature.r, splitVerifySignature.r];
  const s = [splitFromSignature.s, splitToSignature.s, splitVerifySignature.s];
  const { fromState, toState, participant, destination, contractAddress, channelId } = args;
  const data = adjudicatorInterface.functions.concludeAndWithdraw.encode([fromState, toState, participant, destination, channelId, v, r, s]);

  return {
    to: contractAddress,
    data,
  };
}

export function createConcludeTransaction(contractAddress: string, fromState: string, toState: string, fromSignature: string, toSignature: string): TransactionRequest {
  const adjudicatorInterface = getSimpleAdjudicatorInterface();
  const splitFromSignature = splitSignature(fromSignature);
  const splitToSignature = splitSignature(toSignature);
  const v = [splitFromSignature.v, splitToSignature.v];
  const r = [splitFromSignature.r, splitToSignature.r];
  const s = [splitFromSignature.s, splitToSignature.s];
  const data = adjudicatorInterface.functions.conclude.encode([fromState, toState, v, r, s]);

  return {
    to: contractAddress,
    data,
  };
}

export function createWithdrawTransaction(contractAddress: string, participant: string, destination: string, channelId: string, verificationSignature: string) {
  const adjudicatorInterface = getSimpleAdjudicatorInterface();
  const { v, r, s } = splitSignature(verificationSignature);
  const data = adjudicatorInterface.functions.withdraw.encode([participant, destination, channelId, v, r, s]);

  return {
    to: contractAddress,
    data,
  };
}

export function createDeployTransaction(networkId: number, channelId: string, depositAmount: string) {
  const byteCode = getSimpleAdjudicatorBytecode(networkId);
  const data = getSimpleAdjudicatorInterface().deployFunction.encode(byteCode, [channelId, 2]);
  return {
    data,
    value: depositAmount,
  };
}

export function createDepositTransaction(contractAddress: string, depositAmount: string) {
  return {
    to: contractAddress,
    value: depositAmount,
  };
}
