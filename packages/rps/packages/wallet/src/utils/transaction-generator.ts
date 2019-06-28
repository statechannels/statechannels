import { TransactionRequest } from 'ethers/providers';
import { getAdjudicatorInterface } from './contract-utils';
import { splitSignature } from 'ethers/utils';
import { Commitment } from '../domain';
import { asEthersObject } from 'fmg-core';

export function createForceMoveTransaction(
  fromState: Commitment,
  toState: Commitment,
  fromSignature: string,
  toSignature: string,
): TransactionRequest {
  const adjudicatorInterface = getAdjudicatorInterface();

  const splitFromSignature = splitSignature(fromSignature);
  const splitToSignature = splitSignature(toSignature);

  const data = adjudicatorInterface.functions.forceMove.encode([
    asEthersObject(fromState),
    asEthersObject(toState),
    [splitFromSignature, splitToSignature],
  ]);
  return {
    data,
  };
}

export function createRespondWithMoveTransaction(
  nextState: Commitment,
  signature: string,
): TransactionRequest {
  const adjudicatorInterface = getAdjudicatorInterface();
  const data = adjudicatorInterface.functions.respondWithMove.encode([
    asEthersObject(nextState),
    splitSignature(signature),
  ]);
  return {
    data,
  };
}

export function createRefuteTransaction(
  refuteState: Commitment,
  signature: string,
): TransactionRequest {
  const adjudicatorInterface = getAdjudicatorInterface();
  const data = adjudicatorInterface.functions.refute.encode([
    asEthersObject(refuteState),
    splitSignature(signature),
  ]);
  return {
    data,
  };
}

export interface ConcludeAndWithdrawArgs {
  fromCommitment: Commitment;
  toCommitment: Commitment;
  fromSignature: string;
  toSignature: string;
  participant: string;
  destination: string;
  amount: string;
  verificationSignature: string;
}
export function createConcludeAndWithdrawTransaction(
  args: ConcludeAndWithdrawArgs,
): TransactionRequest {
  const adjudicatorInterface = getAdjudicatorInterface();
  const splitFromSignature = splitSignature(args.fromSignature);
  const splitToSignature = splitSignature(args.toSignature);
  const conclusionProof = {
    penultimateCommitment: asEthersObject(args.fromCommitment),
    ultimateCommitment: asEthersObject(args.toCommitment),
    penultimateSignature: splitFromSignature,
    ultimateSignature: splitToSignature,
  };
  const { v, r, s } = splitSignature(args.verificationSignature);
  const { participant, destination, amount } = args;
  const data = adjudicatorInterface.functions.concludeAndWithdraw.encode([
    conclusionProof,
    participant,
    destination,
    amount,
    v,
    r,
    s,
  ]);

  return {
    data,
    gasLimit: 3000000,
  };
}

export function createConcludeTransaction(
  fromState: Commitment,
  toState: Commitment,
  fromSignature: string,
  toSignature: string,
): TransactionRequest {
  const adjudicatorInterface = getAdjudicatorInterface();
  const splitFromSignature = splitSignature(fromSignature);
  const splitToSignature = splitSignature(toSignature);
  const conclusionProof = {
    penultimateCommitment: asEthersObject(fromState),
    ultimateCommitment: asEthersObject(toState),
    penultimateSignature: splitFromSignature,
    ultimateSignature: splitToSignature,
  };
  const data = adjudicatorInterface.functions.conclude.encode([conclusionProof]);

  return {
    data,
  };
}

export function createWithdrawTransaction(
  amount: string,
  participant: string,
  destination: string,
  verificationSignature: string,
) {
  const adjudicatorInterface = getAdjudicatorInterface();
  const { v, r, s } = splitSignature(verificationSignature);
  const data = adjudicatorInterface.functions.withdraw.encode([
    participant,
    destination,
    amount,
    v,
    r,
    s,
  ]);

  return {
    data,
    gasLimit: 3000000,
  };
}

export function createTransferAndWithdrawTransaction(
  channelId: string,
  participant: string,
  destination: string,
  amount: string,
  verificationSignature: string,
) {
  const adjudicatorInterface = getAdjudicatorInterface();
  const { v, r, s } = splitSignature(verificationSignature);
  const data = adjudicatorInterface.functions.transferAndWithdraw.encode([
    channelId,
    participant,
    destination,
    amount,
    v,
    r,
    s,
  ]);

  return {
    data,
    gasLimit: 3000000,
  };
}

export function createDepositTransaction(
  destination: string,
  depositAmount: string,
  expectedHeld: string,
) {
  const adjudicatorInterface = getAdjudicatorInterface();
  const data = adjudicatorInterface.functions.deposit.encode([destination, expectedHeld]);
  return {
    value: depositAmount,
    data,
  };
}
