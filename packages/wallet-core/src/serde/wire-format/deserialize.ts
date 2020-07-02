import {
  SignedState as SignedStateWire,
  Outcome as OutcomeWire,
  Objective as ObjectiveWire,
  AllocationItem as AllocationItemWire,
  Allocation as AllocationWire,
  Message as WireMessage,
  isAllocations
} from '@statechannels/wire-format';

import {
  SignedState,
  Outcome,
  AllocationItem,
  SimpleAllocation,
  Message,
  Objective
} from '../../store/types';
import {BigNumber} from 'ethers';
import {makeDestination} from '../../utils';
import {convertToInternalParticipant} from '../../messaging';
import {getSignerAddress} from '../../store/state-utils';

export function deserializeMessage(message: WireMessage): Message {
  const signedStates = message?.data?.signedStates?.map(ss => deserializeState(ss));
  const objectives = message?.data?.objectives?.map(objective => deserializeObjective(objective));

  return {
    signedStates,
    objectives
  };
}

export function deserializeState(state: SignedStateWire): SignedState {
  const stateWithoutChannelId = {...state};
  delete stateWithoutChannelId.channelId;
  const deserializedState = {
    ...stateWithoutChannelId,
    challengeDuration: BigNumber.from(state.challengeDuration),
    channelNonce: BigNumber.from(state.channelNonce),
    turnNum: BigNumber.from(state.turnNum),
    outcome: deserializeOutcome(state.outcome),
    participants: stateWithoutChannelId.participants.map(convertToInternalParticipant)
  };

  return {
    ...deserializedState,
    signatures: state.signatures.map(sig => ({
      signature: sig,
      signer: getSignerAddress(deserializedState, sig)
    }))
  };
}

export function deserializeObjective(objective: ObjectiveWire): Objective {
  return {
    ...objective,
    participants: objective.participants.map(p => ({
      ...p,
      destination: makeDestination(p.destination)
    }))
  };
}
// where do I move between token and asset holder?
// I have to have asset holder between the wallets, otherwise there is ambiguity
// I don't want asset holders in the json rpc layer, as the client shouldn't care

function deserializeOutcome(outcome: OutcomeWire): Outcome {
  if (isAllocations(outcome)) {
    switch (outcome.length) {
      case 0:
        // TODO: specify in wire format
        throw new Error('Empty allocation');
      case 1:
        return deserializeAllocation(outcome[0]);
      default:
        return {
          type: 'MixedAllocation',
          simpleAllocations: outcome.map(deserializeAllocation)
        };
    }
  } else {
    if (outcome.length !== 1) {
      throw new Error('Currently only supporting guarantees of length 1.');
    } else {
      return {
        type: 'SimpleGuarantee',
        ...outcome[0]
      };
    }
  }

  // either an outcome is all guarantees or all
}

function deserializeAllocation(allocation: AllocationWire): SimpleAllocation {
  const {assetHolderAddress, allocationItems} = allocation;
  return {
    type: 'SimpleAllocation',
    assetHolderAddress,
    allocationItems: allocationItems.map(deserializeAllocationItem)
  };
}

function deserializeAllocationItem(allocationItem: AllocationItemWire): AllocationItem {
  const {amount, destination} = allocationItem;
  return {destination: makeDestination(destination), amount: BigNumber.from(amount)};
}
