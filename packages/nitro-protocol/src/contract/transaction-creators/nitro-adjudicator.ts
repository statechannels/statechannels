// @ts-ignore
import NitroAdjudicatorArtifact from '../../../build/contracts/NitroAdjudicator.json';
import {ethers} from 'ethers';
import {TransactionRequest} from 'ethers/providers';
import {State, hashState} from '../state';
import {encodeOutcome} from '../outcome';
import {getChannelId} from '../channel';
import { BigNumberish } from 'ethers/utils';

// TODO: Currently we are setting some arbitrary gas limit
// to avoid issues with Ganache sendTransaction and parsing BN.js
// If we don't set a gas limit some transactions will fail
const GAS_LIMIT = 3000000;

const NitroAdjudicatorContractInterface = new ethers.utils.Interface(NitroAdjudicatorArtifact.abi);

export function createPushOutcomeTransaction(
  turnNumRecord: BigNumberish,
  finalizesAt: BigNumberish,
  state: State
): TransactionRequest {
  const channelId = getChannelId(state.channel);
  const stateHash = hashState(state);
  const {participants} = state.channel;
  const challengerAddress = participants[state.turnNum % participants.length];
  const encodedOutcome = encodeOutcome(state.outcome);

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
