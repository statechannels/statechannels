// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/ForceMove.json';
import * as ethers from 'ethers';
import {TransactionRequest} from 'ethers/providers';
import {State, getVariablePart, getFixedPart, hashAppPart} from '../state';
import {Signature, defaultAbiCoder} from 'ethers/utils';
import {hashOutcome} from '../outcome';
import {signChallengeMessage} from '../../signatures';

// TODO: Currently we are setting some arbitrary gas limit
// to avoid issues with Ganache sendTransaction and parsing BN.js
// If we don't set a gas limit some transactions will fail
const GAS_LIMIT = 3000000;

const ForceMoveContractInterface = new ethers.utils.Interface(ForceMoveArtifact.abi);

interface CheckpointData {
  challengeState?: State;
  states: State[];
  signatures: Signature[];
  whoSignedWhat: number[];
}

export const SupportingDataStruct = [
  'tuple(uint8 isFinalCount, uint8[] whoSignedWhat, tuple(uint256 chainId, address[] participants, uint256 channelNonce, address appDefinition, uint256 challengeDuration) fixedPart, tuple(bytes outcome, bytes appData)[] variableParts, tuple(uint8 v, bytes32 r, bytes32 s)[] sigs)',
];

export function createForceMoveTransaction(
  states: State[],
  signatures: Signature[],
  whoSignedWhat: number[],
  challengerPrivateKey: string,
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
  // TODO: Is there a reason why createForceMoveTransaction accepts a State[] and a Signature[]
  // argument rather than a SignedState[] argument?
  const signedStates = states.map(s => ({state: s, signature: {v: 0, r: '', s: ''}}));
  const challengerSignature = signChallengeMessage(signedStates, challengerPrivateKey);

  const supportingData = defaultAbiCoder.encode(SupportingDataStruct, [
    {isFinalCount, whoSignedWhat, fixedPart, variableParts, sigs: signatures},
  ]);
  const challengerSignatureEncoded = defaultAbiCoder.encode(
    ['tuple(uint8 v, bytes32 r, bytes32 s)'],
    [challengerSignature],
  );

  const data = ForceMoveContractInterface.functions.forceMove.encode([
    largestTurnNum,
    supportingData,
    challengerSignatureEncoded,
  ]);
  return {data, gasLimit: GAS_LIMIT};
}

export const RespondDataStruct = [
  'tuple(bool[2] isFinalAB, tuple(uint256 chainId, address[] participants, uint256 channelNonce, address appDefinition, uint256 challengeDuration) fixedPart, tuple(bytes outcome, bytes appData)[2] variablePartAB, tuple(uint8 v, bytes32 r, bytes32 s) sig)',
];

export function createRespondTransaction(
  challengeState: State,
  responseState: State,
  responseSignature: Signature,
): TransactionRequest {
  const {participants} = challengeState.channel;
  const challengerAddress = participants[challengeState.turnNum % participants.length];
  const isFinalAB = [challengeState.isFinal, responseState.isFinal];
  const fixedPart = getFixedPart(responseState);
  const variablePartAB = [getVariablePart(challengeState), getVariablePart(responseState)];
  const respondData = defaultAbiCoder.encode(RespondDataStruct, [
    {isFinalAB, fixedPart, variablePartAB, sig: responseSignature},
  ]);
  const data = ForceMoveContractInterface.functions.respond.encode([
    challengerAddress,
    respondData,
  ]);
  return {data, gasLimit: GAS_LIMIT};
}

export function createCheckpointTransaction({
  states,
  signatures,
  whoSignedWhat,
}: CheckpointData): TransactionRequest {
  const largestTurnNum = Math.max(...states.map(s => s.turnNum));
  const fixedPart = getFixedPart(states[0]);
  const variableParts = states.map(s => getVariablePart(s));
  const isFinalCount = states.filter(s => s.isFinal).length;

  const supportingData = defaultAbiCoder.encode(SupportingDataStruct, [
    {isFinalCount, whoSignedWhat, fixedPart, variableParts, sigs: signatures},
  ]);

  const data = ForceMoveContractInterface.functions.checkpoint.encode([
    largestTurnNum,
    supportingData,
  ]);

  return {data, gasLimit: GAS_LIMIT};
}

const ConcludeDataStruct = [
  'tuple(tuple(uint256 chainId, address[] participants, uint256 channelNonce, address appDefinition, uint256 challengeDuration) fixedPart, uint8 numStates,  uint8[] whoSignedWhat, tuple(uint8 v, bytes32 r, bytes32 s)[] sigs, bytes32 appPartHash, bytes32 outcomeHash)',
];

export function createConcludeTransaction(
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

  const concludeData = defaultAbiCoder.encode(ConcludeDataStruct, [
    {fixedPart, numStates, whoSignedWhat, sigs: signatures, appPartHash, outcomeHash},
  ]);

  const data = ForceMoveContractInterface.functions.conclude.encode([largestTurnNum, concludeData]);
  return {data, gasLimit: GAS_LIMIT};
}
