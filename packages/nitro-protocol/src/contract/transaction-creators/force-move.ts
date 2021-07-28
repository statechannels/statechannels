import {Signature, ethers} from 'ethers';

import ForceMoveArtifact from '../../../artifacts/contracts/ForceMove.sol/ForceMove.json';
import {signChallengeMessage} from '../../signatures';
import {hashOutcome} from '../outcome';
import {getFixedPart, getVariablePart, hashAppPart, State} from '../state';

// https://github.com/ethers-io/ethers.js/issues/602#issuecomment-574671078
export const ForceMoveContractInterface = new ethers.utils.Interface(ForceMoveArtifact.abi);

interface CheckpointData {
  challengeState?: State;
  states: State[];
  signatures: Signature[];
  whoSignedWhat: number[];
}

export function createChallengeTransaction(
  states: State[], // in turnNum order [..,state-with-largestTurnNum]
  signatures: Signature[], // in participant order: [sig-from-p0, sig-from-p1, ...]
  whoSignedWhat: number[],
  challengerPrivateKey: string
): ethers.providers.TransactionRequest {
  // Sanity checks on expected lengths
  if (states.length === 0) {
    throw new Error('No states provided');
  }
  const {participants} = states[0].channel;
  if (participants.length !== signatures.length) {
    throw new Error(
      `Participants (length:${participants.length}) and signatures (length:${signatures.length}) need to be the same length`
    );
  }

  const variableParts = states.map(s => getVariablePart(s));
  const fixedPart = getFixedPart(states[0]);

  // Get the largest turn number from the states
  const largestTurnNum = Math.max(...states.map(s => s.turnNum));
  const isFinalCount = states.filter(s => s.isFinal === true).length;
  // Q: Is there a reason why createForceMoveTransaction accepts a State[] and a Signature[]
  // Argument rather than a SignedState[] argument?
  // A: Yes, because the signatures must be passed in participant order: [sig-from-p0, sig-from-p1, ...]
  // and SignedStates[] won't comply with that in general. This function accetps the re-ordered sigs.
  const signedStates = states.map(s => ({
    state: s,
    signature: {v: 0, r: '', s: '', _vs: '', recoveryParam: 0},
  }));
  const challengerSignature = signChallengeMessage(signedStates, challengerPrivateKey);

  const data = ForceMoveContractInterface.encodeFunctionData('challenge', [
    fixedPart,
    largestTurnNum,
    variableParts,
    isFinalCount,
    signatures,
    whoSignedWhat,
    challengerSignature,
  ]);
  return {data};
}

interface RespondArgs {
  challengeState: State;
  responseState: State;
  responseSignature: Signature;
}
export function respondArgs({
  challengeState,
  responseState,
  responseSignature,
}: RespondArgs): any[] {
  const isFinalAB = [challengeState.isFinal, responseState.isFinal];
  const fixedPart = getFixedPart(responseState);
  const variablePartAB = [getVariablePart(challengeState), getVariablePart(responseState)];
  return [isFinalAB, fixedPart, variablePartAB, responseSignature];
}

export function createRespondTransaction(args: RespondArgs): ethers.providers.TransactionRequest {
  const data = ForceMoveContractInterface.encodeFunctionData('respond', respondArgs(args));
  return {data};
}

export function createCheckpointTransaction({
  states,
  signatures,
  whoSignedWhat,
}: CheckpointData): ethers.providers.TransactionRequest {
  const data = ForceMoveContractInterface.encodeFunctionData(
    'checkpoint',
    checkpointArgs({states, signatures, whoSignedWhat})
  );

  return {data};
}

export function checkpointArgs({states, signatures, whoSignedWhat}: CheckpointData): any[] {
  const largestTurnNum = Math.max(...states.map(s => s.turnNum));
  const fixedPart = getFixedPart(states[0]);
  const variableParts = states.map(s => getVariablePart(s));
  const isFinalCount = states.filter(s => s.isFinal).length;

  return [fixedPart, largestTurnNum, variableParts, isFinalCount, signatures, whoSignedWhat];
}

export function createConcludeTransaction(
  states: State[],
  signatures: Signature[],
  whoSignedWhat: number[]
): ethers.providers.TransactionRequest {
  const data = ForceMoveContractInterface.encodeFunctionData(
    'conclude',
    concludeArgs(states, signatures, whoSignedWhat)
  );
  return {data};
}

export function concludeArgs(
  states: State[],
  signatures: Signature[],
  whoSignedWhat: number[]
): any[] {
  // Sanity checks on expected lengths
  if (states.length === 0) {
    throw new Error('No states provided');
  }
  const {participants} = states[0].channel;
  if (participants.length !== signatures.length) {
    throw new Error(
      `Participants (length:${participants.length}) and signatures (length:${signatures.length}) need to be the same length`
    );
  }

  const lastState = states.reduce((s1, s2) => (s1.turnNum >= s2.turnNum ? s1 : s2), states[0]);
  const largestTurnNum = lastState.turnNum;
  const fixedPart = getFixedPart(lastState);
  const appPartHash = hashAppPart(lastState);

  const outcomeHash = hashOutcome(lastState.outcome);

  const numStates = states.length;

  return [
    largestTurnNum,
    fixedPart,
    appPartHash,
    outcomeHash,
    numStates,
    whoSignedWhat,
    signatures,
  ];
}
