import {utils, providers, Signature, constants} from 'ethers';

import NitroAdjudicatorArtifact from '../../../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';
import {getChannelId, hashState} from '../../';
import {encodeOutcome} from '../outcome';
import {getFixedPart, hashAppPart, State} from '../state';

// https://github.com/ethers-io/ethers.js/issues/602#issuecomment-574671078
const NitroAdjudicatorContractInterface = new utils.Interface(NitroAdjudicatorArtifact.abi);

export function concludeAndTransferAllAssetsArgs(
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

  const outcomeBytes = encodeOutcome(lastState.outcome);

  const numStates = states.length;

  return [
    largestTurnNum,
    fixedPart,
    appPartHash,
    outcomeBytes,
    numStates,
    whoSignedWhat,
    signatures,
  ];
}

export function createConcludeAndTransferAllAssetsTransaction(
  states: State[],
  signatures: Signature[],
  whoSignedWhat: number[]
): providers.TransactionRequest {
  return {
    data: NitroAdjudicatorContractInterface.encodeFunctionData(
      'concludeAndTransferAllAssets',
      concludeAndTransferAllAssetsArgs(states, signatures, whoSignedWhat)
    ),
  };
}

function transferAllAssetsArgs(
  state: State,
  overrideStateHash = false // set to true if channel concluded happily
): any[] {
  const channelId = getChannelId(state.channel);
  const outcomeBytes = encodeOutcome(state.outcome);
  const stateHash = overrideStateHash ? constants.HashZero : hashState(state);
  return [channelId, outcomeBytes, stateHash];
}

export function createTransferAllAssetsTransaction(
  state: State,
  overrideStateHash = false // set to true if channel concluded happily
): providers.TransactionRequest {
  return {
    data: NitroAdjudicatorContractInterface.encodeFunctionData(
      'transferAllAssets',
      transferAllAssetsArgs(state, overrideStateHash)
    ),
  };
}
