// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/ForceMove.json';
import * as ethers from 'ethers';
import {TransactionRequest} from 'ethers/providers';
import {State, getVariablePart, getFixedPart, hashAppPart} from '../state';
import {Signature} from 'ethers/utils';
import {hashOutcome} from '../outcome';
import {channelStorageStruct} from '../channel-storage';
import {Zero} from 'ethers/constants';

// TODO: Currently we are setting some arbitrary gas limit
// to avoid issues with Ganache sendTransaction and parsing BN.js
// If we don't set a gas limit some transactions will fail
const GAS_LIMIT = 3000000;

const ForceMoveContractInterface = new ethers.utils.Interface(ForceMoveArtifact.abi);

interface CheckpointData {
  challengeState?: State;
  finalizesAt?: number;
  turnNumRecord: number;
  states: State[];
  signatures: Signature[];
  whoSignedWhat: number[];
}
export function createCheckpointTransaction({
  challengeState,
  finalizesAt = 0,
  states,
  signatures,
  whoSignedWhat,
  turnNumRecord,
}: CheckpointData): TransactionRequest {
  const isOpen = Zero.eq(finalizesAt);
  if (isOpen && challengeState) {
    throw new Error('Invalid open storage');
  }

  const largestTurnNum = Math.max(...states.map(s => s.turnNum));
  const fixedPart = getFixedPart(states[0]);
  const variableParts = states.map(s => getVariablePart(s));
  const isFinalCount = states.filter(s => s.isFinal).length;
  const {participants} = states[0].channel;

  const outcome = isOpen ? undefined : challengeState.outcome;
  const challengerAddress = isOpen
    ? undefined
    : participants[challengeState.turnNum % participants.length];

  const data = ForceMoveContractInterface.functions.checkpoint.encode([
    fixedPart,
    largestTurnNum,
    variableParts,
    isFinalCount,
    signatures,
    whoSignedWhat,
    channelStorageStruct({
      outcome,
      finalizesAt,
      challengerAddress,
      state: challengeState,
      turnNumRecord,
    }),
  ]);

  return {data, gasLimit: GAS_LIMIT};
}

export function createRespondTransaction(
  turnNumRecord: number,
  finalizesAt: number,
  challengeState: State,
  responseState: State,
  responseSignature: Signature,
): TransactionRequest {
  const {participants} = challengeState.channel;
  const challengerAddress = participants[challengeState.turnNum % participants.length];
  const isFinalAB = [challengeState.isFinal, responseState.isFinal];
  const fixedPart = getFixedPart(responseState);
  const variablePartAB = [getVariablePart(challengeState), getVariablePart(responseState)];
  const data = ForceMoveContractInterface.functions.respond.encode([
    turnNumRecord,
    finalizesAt,
    challengerAddress,
    isFinalAB,
    fixedPart,
    variablePartAB,
    responseSignature,
  ]);
  return {data, gasLimit: GAS_LIMIT};
}

export function createConcludeFromChallengeTransaction(
  turnNumRecord: number,
  challengeState: State,
  finalizesAt: number,
  states: State[],
  signatures: Signature[],
  whoSignedWhat: number[],
): TransactionRequest {
  if (states.length === 0) {
    throw new Error('No states provided');
  }
  const {participants} = states[0].channel;
  if (participants.length !== signatures.length) {
    throw new Error(
      `Participants (length:${participants.length}) and signatures (length:${signatures.length}) need to be the same length`,
    );
  }
  const lastState = states.reduce((s1, s2) => (s1.turnNum >= s2.turnNum ? s1 : s2), states[0]);

  const largestTurnNum = lastState.turnNum;
  const fixedPart = getFixedPart(lastState);
  const appPartHash = hashAppPart(lastState);
  const numStates = states.length;

  const {outcome} = challengeState;

  const challengerAddress = participants[challengeState.turnNum % participants.length];
  const channelStorage = channelStorageStruct({
    outcome,
    finalizesAt,
    state: challengeState,
    challengerAddress,
    turnNumRecord,
  });

  const data = ForceMoveContractInterface.functions.concludeFromChallenge.encode([
    largestTurnNum,
    fixedPart,
    appPartHash,
    numStates,
    whoSignedWhat,
    signatures,
    channelStorage,
  ]);
  return {data, gasLimit: GAS_LIMIT};
}

export function createConcludeFromOpenTransaction(
  turnNumRecord: number,
  states: State[],
  signatures: Signature[],
  whoSignedWhat: number[],
): TransactionRequest {
  // Sanity checks on expected lengths
  if (states.length === 0) {
    throw new Error('No states provided');
  }
  const {participants} = states[0].channel;
  if (participants.length !== signatures.length) {
    throw new Error(
      `Participants (length:${participants.length}) and signatures (length:${signatures.length}) need to be the same length`,
    );
  }

  const lastState = states.reduce((s1, s2) => (s1.turnNum >= s2.turnNum ? s1 : s2), states[0]);
  const largestTurnNum = lastState.turnNum;
  const fixedPart = getFixedPart(lastState);
  const appPartHash = hashAppPart(lastState);

  const outcomeHash = hashOutcome(lastState.outcome);

  const numStates = states.length;

  const data = ForceMoveContractInterface.functions.concludeFromOpen.encode([
    turnNumRecord,
    largestTurnNum,
    fixedPart,
    appPartHash,
    outcomeHash,
    numStates,
    whoSignedWhat,
    signatures,
  ]);
  return {data, gasLimit: GAS_LIMIT};
}

export function createRefuteTransaction(
  turnNumRecord: number,
  finalizesAt: number,
  challengeState: State,
  refuteState: State,
  refutationStateSignature: Signature,
): TransactionRequest {
  const {participants} = challengeState.channel;
  const variablePartAB = [getVariablePart(challengeState), getVariablePart(refuteState)];
  const fixedPart = getFixedPart(refuteState);
  const isFinalAB = [challengeState.isFinal, refuteState.isFinal];

  const challengerAddress = participants[challengeState.turnNum % participants.length];
  const refutationStateTurnNum = refuteState.turnNum;

  const data = ForceMoveContractInterface.functions.refute.encode([
    turnNumRecord,
    refutationStateTurnNum,
    finalizesAt,
    challengerAddress,
    isFinalAB,
    fixedPart,
    variablePartAB,
    refutationStateSignature,
  ]);
  return {data, gasLimit: GAS_LIMIT};
}

export function createForceMoveTransaction(
  turnNumRecord: number,
  states: State[],
  signatures: Signature[],
  whoSignedWhat: number[],
  challengerSignature: Signature,
): TransactionRequest {
  // Sanity checks on expected lengths
  if (states.length === 0) {
    throw new Error('No states provided');
  }
  const {participants} = states[0].channel;
  if (participants.length !== signatures.length) {
    throw new Error(
      `Participants (length:${participants.length}) and signatures (length:${signatures.length}) need to be the same length`,
    );
  }

  const variableParts = states.map(s => getVariablePart(s));
  const fixedPart = getFixedPart(states[0]);

  // Get the largest turn number from the states
  const largestTurnNum = Math.max(...states.map(s => s.turnNum));
  const isFinalCount = states.filter(s => s.isFinal === true).length;

  const data = ForceMoveContractInterface.functions.forceMove.encode([
    turnNumRecord,
    fixedPart,
    largestTurnNum,
    variableParts,
    isFinalCount,
    signatures,
    whoSignedWhat,
    challengerSignature,
  ]);
  return {data, gasLimit: GAS_LIMIT};
}
