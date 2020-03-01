import {
  SignedState as SignedStateWire,
  Outcome as OutcomeWire,
  AllocationItem as AllocationItemWire,
  Allocation as AllocationWire
} from '@statechannels/wire-format';
import {SignedState, Outcome, AllocationItem, SimpleAllocation} from '../../store/types';
import {calculateChannelId} from '../../store/state-utils';

export function serializeState(state: SignedState): SignedStateWire {
  return {
    ...state,
    challengeDuration: state.challengeDuration.toHexString(),
    channelNonce: state.channelNonce.toHexString(),
    turnNum: state.turnNum.toHexString(),
    outcome: serializeOutcome(state.outcome),
    channelId: calculateChannelId(state)
  };
}

function serializeOutcome(outcome: Outcome): OutcomeWire {
  switch (outcome.type) {
    case 'SimpleAllocation':
      return [serializeSimpleAllocation(outcome)];
    case 'MixedAllocation':
      return outcome.simpleAllocations.map(serializeSimpleAllocation);
    case 'SimpleGuarantee':
      // TODO
      return [];
  }
}

function serializeSimpleAllocation(allocation: SimpleAllocation): AllocationWire {
  return {
    assetHolderAddress: allocation.assetHolderAddress,
    allocationItems: allocation.allocationItems.map(serializeAllocationItem)
  };
}

function serializeAllocationItem(allocationItem: AllocationItem): AllocationItemWire {
  const {destination, amount} = allocationItem;
  return {destination, amount: amount.toHexString()};
}
