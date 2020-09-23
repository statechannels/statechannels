import {
  SignedState as SignedStateWire,
  Outcome as OutcomeWire,
  AllocationItem as AllocationItemWire,
  Allocation as AllocationWire,
  Guarantee as GuaranteeWire,
  Message as WireMessage,
  Objective as ObjectiveWire
} from '@statechannels/wire-format';

import {
  SignedState,
  Outcome,
  AllocationItem,
  SimpleAllocation,
  Payload,
  Objective,
  SimpleGuarantee
} from '../../types';
import {calculateChannelId} from '../../state-utils';
import {formatAmount} from '../../utils';

export function serializeMessage(message: Payload, recipient: string, sender: string): WireMessage {
  const signedStates = (message.signedStates || []).map(serializeState);
  const objectives = message.objectives?.map(serializeObjective);
  const {requests} = message;
  return {
    recipient,
    sender,
    data: {signedStates, objectives, requests}
  };
}

export function serializeState(state: SignedState): SignedStateWire {
  const {
    chainId,
    participants,
    channelNonce,
    appDefinition,
    challengeDuration,
    turnNum,
    appData,
    isFinal
  } = state;

  return {
    chainId,
    participants,
    channelNonce,
    appDefinition,
    challengeDuration,
    turnNum,
    appData,
    isFinal,
    outcome: serializeOutcome(state.outcome),
    channelId: calculateChannelId(state),
    signatures: state.signatures.map(s => s.signature)
  };
}

export function serializeObjective(objective: Objective): ObjectiveWire {
  switch (objective.type) {
    case 'CreateChannel':
      return {
        ...objective,
        data: {...objective.data, signedState: serializeState(objective.data.signedState)}
      };
    default:
      return objective;
  }
}

export function serializeOutcome(outcome: Outcome): OutcomeWire {
  if (outcome instanceof Array)
    throw new Error('Cannot serialize array-ified outcome. Did you call serialize twice?');

  switch (outcome.type) {
    case 'SimpleAllocation':
      return [serializeSimpleAllocation(outcome)];
    case 'MixedAllocation':
      return outcome.simpleAllocations.map(serializeSimpleAllocation);
    case 'SimpleGuarantee':
      return [serializeSimpleGuarantee(outcome)];
  }
}

function serializeSimpleAllocation(allocation: SimpleAllocation): AllocationWire {
  return {
    assetHolderAddress: allocation.assetHolderAddress,
    allocationItems: allocation.allocationItems.map(serializeAllocationItem)
  };
}

function serializeSimpleGuarantee(guarantee: SimpleGuarantee): GuaranteeWire {
  return {
    assetHolderAddress: guarantee.assetHolderAddress,
    targetChannelId: guarantee.targetChannelId,
    destinations: guarantee.destinations
  };
}

function serializeAllocationItem(allocationItem: AllocationItem): AllocationItemWire {
  const {destination, amount} = allocationItem;
  return {destination, amount: formatAmount(amount)};
}
