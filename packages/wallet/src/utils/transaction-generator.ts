import { TransactionRequest } from 'ethers/providers';
import { getAdjudicatorInterface } from './contract-utils';
import { splitSignature } from 'ethers/utils';
import { Commitment, SignedCommitment, signCommitment2 } from '../domain';
import { asEthersObject } from 'fmg-core';
import { Transactions as nitroTrans, SignedState } from 'nitro-protocol';
import { getChannelStorage, convertAddressToBytes32 } from './nitro-converter';
import { signChallengeMessage } from 'nitro-protocol/lib/src/signatures';
// TODO: This should be exported by `nitro-protocol`
import { createDepositTransaction as createNitroDepositTransaction } from 'nitro-protocol/lib/src/contract/transaction-creators/eth-asset-holder';

export function createForceMoveTransaction(
  fromCommitment: SignedCommitment,
  toCommitment: SignedCommitment,
  privateKey: string,
): TransactionRequest {
  const channelStorage = getChannelStorage(toCommitment.commitment);
  const signedStates = [fromCommitment.signedState, toCommitment.signedState];
  const challengeSignature = signChallengeMessage(signedStates, privateKey);
  return nitroTrans.createForceMoveTransaction(channelStorage, signedStates, challengeSignature);
}

export function createRespondWithMoveTransaction(
  nextState: Commitment,
  privateKey: string,
): TransactionRequest {
  const channelStorage = getChannelStorage(nextState);
  // Why should `signCommitment2` be used instead of `signCommitment`?
  const signedState = signCommitment2(nextState, privateKey).signedState;
  return nitroTrans.createRespondTransaction(channelStorage, signedState);
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
  signedFromCommitment: SignedCommitment,
  signedToCommitment: SignedCommitment,
): TransactionRequest {
  const signedStates: SignedState[] = [
    signedFromCommitment.signedState,
    signedToCommitment.signedState,
  ];
  const channelStorage = getChannelStorage(signedToCommitment.commitment);
  return nitroTrans.createConcludeTransaction(channelStorage, signedStates);
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
  return createNitroDepositTransaction(
    convertAddressToBytes32(destination),
    expectedHeld,
    depositAmount,
  );
}
