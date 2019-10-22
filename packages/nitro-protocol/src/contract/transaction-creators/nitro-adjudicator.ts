// @ts-ignore
import {TransactionRequest} from 'ethers/providers';
import {Interface} from 'ethers/utils';
import NitroAdjudicatorArtifact from '../../../build/contracts/NitroAdjudicator.json';
import {getChannelId} from '../channel';
import {encodeOutcome, Outcome} from '../outcome';
import {hashState, State} from '../state';

// TODO: Currently we are setting some arbitrary gas limit
// to avoid issues with Ganache sendTransaction and parsing BN.js
// If we don't set a gas limit some transactions will fail
const GAS_LIMIT = 3000000;

const NitroAdjudicatorContractInterface = new Interface(NitroAdjudicatorArtifact.abi);

export function createPushOutcomeTransaction(
  turnNumRecord: number,
  finalizesAt: number,
  state: State,
  outcome: Outcome
): TransactionRequest {
  const channelId = getChannelId(state.channel);
  const stateHash = hashState(state);
  const {participants} = state.channel;
  const challengerAddress = participants[state.turnNum % participants.length];
  const encodedOutcome = encodeOutcome(outcome);

  const data = NitroAdjudicatorContractInterface.functions.pushOutcome.encode([
    channelId,
    turnNumRecord,
    finalizesAt,
    stateHash,
    challengerAddress,
    encodedOutcome,
  ]);

  return {data, gasLimit: GAS_LIMIT};
}
