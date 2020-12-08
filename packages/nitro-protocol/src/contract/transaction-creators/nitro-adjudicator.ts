import {utils, providers, Signature, constants} from 'ethers';

import NitroAdjudicatorArtifact from '../../../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';
import {getChannelId} from '../channel';
import {encodeOutcome, Outcome} from '../outcome';
import {getFixedPart, hashAppPart, hashState, State} from '../state';

// https://github.com/ethers-io/ethers.js/issues/602#issuecomment-574671078
const NitroAdjudicatorContractInterface = new utils.Interface(NitroAdjudicatorArtifact.abi);

export type PushOutcomeTransactionArg = {
  turnNumRecord: number;
  finalizesAt: number;
  state: State;
  outcome: Outcome;
  channelWasConcluded?: boolean;
  challengerAddress?: string;
};

export const createPushOutcomeTransactionFactory = (transferAll: boolean) => (
  arg: PushOutcomeTransactionArg
): providers.TransactionRequest => {
  const defaults = {channelWasConcluded: false, challengerAddress: constants.AddressZero};
  const {turnNumRecord, finalizesAt, state, outcome, channelWasConcluded, challengerAddress} = {
    ...defaults,
    ...arg,
  };
  if (channelWasConcluded && turnNumRecord !== 0)
    throw Error('If the channel was concluded, you should use 0 for turnNumRecord');
  const channelId = getChannelId(state.channel);
  const stateHash = channelWasConcluded ? constants.HashZero : hashState(state);
  const encodedOutcome = encodeOutcome(outcome);

  const funcName = transferAll ? 'pushOutcomeAndTransferAll' : 'pushOutcome';
  const data = NitroAdjudicatorContractInterface.encodeFunctionData(funcName, [
    channelId,
    turnNumRecord,
    finalizesAt,
    stateHash,
    challengerAddress,
    encodedOutcome,
  ]);

  return {data};
};

export function concludePushOutcomeAndTransferAllArgs(
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

export function createConcludePushOutcomeAndTransferAllTransaction(
  states: State[],
  signatures: Signature[],
  whoSignedWhat: number[]
): providers.TransactionRequest {
  return {
    data: NitroAdjudicatorContractInterface.encodeFunctionData(
      'concludePushOutcomeAndTransferAll',
      concludePushOutcomeAndTransferAllArgs(states, signatures, whoSignedWhat)
    ),
  };
}
