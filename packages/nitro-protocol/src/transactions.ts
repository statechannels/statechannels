import {Contract, providers, Signature} from 'ethers';

import {Uint256} from './contract/types';
import {State} from './contract/state';
import {getStateSignerAddress, SignedState} from './signatures';
import {ForceMoveAppContractInterface} from './contract/force-move-app';
// https://github.com/microsoft/rushstack/issues/1029
import {
  createRespondTransaction as _createRespondTransaction,
  createChallengeTransaction as _createChallengeTransaction,
  createConcludeTransaction as _createConcludeTransaction,
  createCheckpointTransaction as _createCheckpointTransaction,
} from './contract/transaction-creators/force-move';
import {
  createPushOutcomeTransactionFactory,
  PushOutcomeTransactionArg,
  createConcludePushOutcomeAndTransferAllTransaction as _createConcludePushOutcomeAndTransferAllTransaction,
} from './contract/transaction-creators/nitro-adjudicator';

// CONSTANTS
export const MAX_TX_DATA_SIZE = 128 * 1024; // (bytes) https://github.com/ethereum/go-ethereum/blob/f59ed3565d18c1fa676fd34f4fd41ecccad707e8/core/tx_pool.go#L51
export const NITRO_MAX_GAS = 6_000_000; // should be below the block gas limit, which can change over time and is generally different on mainnet, testnet and ganache.
// sampling some recent blocks on 26/11/2020:
// mainnet  12505858
// ropsten:  8000029
// rinkeby: 10000000
// ganache:  6721975 (hardcoded but can be overriden via config)

export async function getChannelStorage(
  provider: providers.Provider,
  contractAddress: string,
  channelId: string
): Promise<[Uint256, Uint256, Uint256]> {
  const forceMove = new Contract(contractAddress, ForceMoveAppContractInterface, provider);
  return await forceMove.getChannelStorage(channelId);
}

export function createChallengeTransaction(
  signedStates: SignedState[],
  challengePrivateKey: string
): providers.TransactionRequest {
  const {states, signatures, whoSignedWhat} = createSignatureArguments(signedStates);

  return _createChallengeTransaction(states, signatures, whoSignedWhat, challengePrivateKey);
}

export function createRespondTransaction(
  challengeState: State,
  response: SignedState
): providers.TransactionRequest {
  if (!challengeState) {
    throw new Error('No active challenge in challenge state');
  }
  return _createRespondTransaction({
    challengeState,
    responseState: response.state,
    responseSignature: response.signature,
  });
}

export function createCheckpointTransaction(
  signedStates: SignedState[]
): providers.TransactionRequest {
  const {states, signatures, whoSignedWhat} = createSignatureArguments(signedStates);
  return _createCheckpointTransaction({
    states,
    signatures,
    whoSignedWhat,
  });
}

export function createConcludePushOutcomeAndTransferAllTransaction(
  signedStates: SignedState[]
): providers.TransactionRequest {
  const {states, signatures, whoSignedWhat} = createSignatureArguments(signedStates);
  return _createConcludePushOutcomeAndTransferAllTransaction(states, signatures, whoSignedWhat);
}

export function createConcludeTransaction(
  conclusionProof: SignedState[]
): providers.TransactionRequest {
  const {states, signatures, whoSignedWhat} = createSignatureArguments(conclusionProof);
  return _createConcludeTransaction(states, signatures, whoSignedWhat);
}

export const createPushOutcomeTransaction: (
  arg: PushOutcomeTransactionArg
) => providers.TransactionRequest = createPushOutcomeTransactionFactory(false);

export const createPushOutcomeAndTransferAllTransaction: (
  arg: PushOutcomeTransactionArg
) => providers.TransactionRequest = createPushOutcomeTransactionFactory(true);

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
