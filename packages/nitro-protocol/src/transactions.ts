import {Contract} from 'ethers';
import {providers} from 'ethers';
import {utils} from 'ethers';
import {State} from './contract/state';
import * as forceMoveTrans from './contract/transaction-creators/force-move';
import * as nitroAdjudicatorTrans from './contract/transaction-creators/nitro-adjudicator';
import {getStateSignerAddress} from './signatures';
import {SignedState} from '.';

export async function getData(provider, contractAddress: string, channelId: string) {
  const forceMove = new Contract(
    contractAddress,
    forceMoveTrans.ForceMoveContractInterface,
    provider
  );
  return await forceMove.getData(channelId);
}

export function createForceMoveTransaction(
  signedStates: SignedState[],
  challengePrivateKey: string
): providers.TransactionRequest {
  const {states, signatures, whoSignedWhat} = createSignatureArguments(signedStates);

  return forceMoveTrans.createForceMoveTransaction(
    states,
    signatures,
    whoSignedWhat,
    challengePrivateKey
  );
}

export function createRespondTransaction(
  challengeState: State,
  response: SignedState
): providers.TransactionRequest {
  if (!challengeState) {
    throw new Error('No active challenge in challenge state');
  }
  return forceMoveTrans.createRespondTransaction({
    challengeState,
    responseState: response.state,
    responseSignature: response.signature,
  });
}

export function createCheckpointTransaction(
  signedStates: SignedState[]
): providers.TransactionRequest {
  const {states, signatures, whoSignedWhat} = createSignatureArguments(signedStates);
  return forceMoveTrans.createCheckpointTransaction({
    states,
    signatures,
    whoSignedWhat,
  });
}

export function createConcludePushOutcomeAndTransferAllTransaction(
  signedStates: SignedState[]
): providers.TransactionRequest {
  const {states, signatures, whoSignedWhat} = createSignatureArguments(signedStates);
  return nitroAdjudicatorTrans.createConcludePushOutcomeAndTransferAllTransaction(
    states,
    signatures,
    whoSignedWhat
  );
}

export function createConcludeTransaction(
  conclusionProof: SignedState[]
): providers.TransactionRequest {
  const {states, signatures, whoSignedWhat} = createSignatureArguments(conclusionProof);
  return forceMoveTrans.createConcludeTransaction(states, signatures, whoSignedWhat);
}

// Currently we assume each signedState is a unique combination of state/signature
// So if multiple participants sign a state we expect a SignedState for each participant
function createSignatureArguments(
  signedStates: SignedState[]
): {states: State[]; signatures: utils.Signature[]; whoSignedWhat: number[]} {
  const {participants} = signedStates[0].state.channel;

  // Get a list of all unique states.
  const uniqueSignedStates = signedStates.filter((s, i, a) => a.indexOf(s) === i);
  const states = uniqueSignedStates.map(s => s.state);

  // Generate whoSignedWhat based on the original list of states (which may contain the same state signed by multiple participants)
  const whoSignedWhat = signedStates.map(s => participants.indexOf(getStateSignerAddress(s)));
  const signatures = [];
  participants.forEach((p, i) => signatures.push(uniqueSignedStates[whoSignedWhat[i]].signature));

  return {states, signatures, whoSignedWhat};
}
