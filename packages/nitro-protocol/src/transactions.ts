import {Contract, providers} from 'ethers';
import {State} from './contract/state';
import * as forceMoveTrans from './contract/transaction-creators/force-move';
import * as nitroAdjudicatorTrans from './contract/transaction-creators/nitro-adjudicator';
import {getStateSignerAddress} from './signatures';
import {SignedState} from '.';
import {Signature} from 'ethers/utils';

export async function getChannelStorage(provider, contractAddress: string, channelId: string) {
  const forceMove = new Contract(
    contractAddress,
    forceMoveTrans.ForceMoveContractInterface,
    provider
  );
  return await forceMove.getChannelStorage(channelId);
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
export function createSignatureArguments(
  signedStates: SignedState[]
): {states: State[]; signatures: Signature[]; whoSignedWhat: number[]} {
  const {participants} = signedStates[0].state.channel;
  const states = [];
  const whoSignedWhat = new Array<number>(participants.length);

  // Get a list of all unique signed states.
  const uniqueSignedStates = signedStates.filter((s, i, a) => a.indexOf(s) === i);
  // We may receive multiple Signed States which have the same state and different signatures
  // so we get a list of unique states ignoring their signatures
  // which allows us to create a single state with multiple signatures
  const uniqueStates = uniqueSignedStates.map(s => s.state).filter((s, i, a) => a.indexOf(s) === i);
  const signatures = new Array<Signature>(uniqueStates.length);
  for (let i = 0; i < uniqueStates.length; i++) {
    states.push(uniqueStates[i]);
    // Get a list of all signed states that have the state
    const signedStatesForUniqueState = uniqueSignedStates.filter(s => s.state === uniqueStates[i]);
    // Iterate through the signatures and set signatures/whoSignedWhawt
    for (const ss of signedStatesForUniqueState) {
      const participantIndex = participants.indexOf(getStateSignerAddress(ss));

      signatures[participantIndex] = ss.signature;
      whoSignedWhat[participantIndex] = i;
    }
  }

  return {
    states,
    signatures,
    whoSignedWhat,
  };
}
