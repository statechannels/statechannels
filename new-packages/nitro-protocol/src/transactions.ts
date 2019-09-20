import * as forceMoveTrans from './contract/transaction-creators/force-move';
import {TransactionRequest} from 'ethers/providers';
import {State} from './contract/state';
import {Signature} from 'ethers/utils';
import {getStateSignerAddress} from './signatures';
import {ChannelStorage, SignedState} from '.';

export function createForceMoveTransaction(
  channelStorage: ChannelStorage,
  signedStates: SignedState[],
  challengeSignature: Signature,
): TransactionRequest {
  const {states, signatures, whoSignedWhat} = createSignatureArguments(signedStates);

  return forceMoveTrans.createForceMoveTransaction(
    channelStorage.turnNumRecord,
    states,
    signatures,
    whoSignedWhat,
    challengeSignature,
  );
}
export function createRespondTransaction(
  channelStorage: ChannelStorage,
  response: SignedState,
): TransactionRequest {
  if (!channelStorage.challengeState) {
    throw new Error('No active challenge in challenge state');
  }
  return forceMoveTrans.createRespondTransaction(
    channelStorage.turnNumRecord,
    channelStorage.finalizesAt,
    channelStorage.challengeState,
    response.state,
    response.signature,
  );
}

export function createCheckpointTransaction(
  channelStorage: ChannelStorage,
  signedStates: SignedState[],
): TransactionRequest {
  const {states, signatures, whoSignedWhat} = createSignatureArguments(signedStates);
  return forceMoveTrans.createCheckpointTransaction({
    ...channelStorage,
    states,
    signatures,
    whoSignedWhat,
  });
}

export function createConcludeTransaction(
  channelStorage: ChannelStorage,
  conclusionProof: SignedState[],
): TransactionRequest {
  const {states, signatures, whoSignedWhat} = createSignatureArguments(conclusionProof);
  if (!channelStorage.challengeState) {
    return forceMoveTrans.createConcludeFromOpenTransaction(
      channelStorage.turnNumRecord,
      states,
      signatures,
      whoSignedWhat,
    );
  } else {
    return forceMoveTrans.createConcludeFromChallengeTransaction(
      channelStorage.turnNumRecord,
      channelStorage.challengeState,
      channelStorage.finalizesAt,
      states,
      signatures,
      whoSignedWhat,
    );
  }
}

// Currently we assume each signedState is a unique combination of state/signature
// So if multiple participants sign a state we expect a SignedState for each participant
function createSignatureArguments(
  signedStates: SignedState[],
): {states: State[]; signatures: Signature[]; whoSignedWhat: number[]} {
  const {participants} = signedStates[0].state.channel;

  // Get a list of all unique states.
  const states = signedStates.filter((s, i, a) => a.indexOf(s) === i).map(s => s.state);
  const signatures = signedStates.map(s => s.signature);
  // Generate whoSignedWhat based on the original list of states (which may contain the same state signed by multiple participants)
  const whoSignedWhat = signedStates.map(s => participants.indexOf(getStateSignerAddress(s)));

  return {states, signatures, whoSignedWhat};
}
