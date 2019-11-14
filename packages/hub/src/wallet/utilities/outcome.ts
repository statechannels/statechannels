import {isAllocationOutcome, Outcome} from '@statechannels/nitro-protocol';
import {AssetOutcome} from '@statechannels/nitro-protocol/lib/src/contract/outcome';

function assetOutcomeAddPriorities(assetOutcome: AssetOutcome) {
  if (isAllocationOutcome(assetOutcome)) {
    const allocationsWithPriorities = assetOutcome.allocation.map((allocationItem, index) => ({
      ...allocationItem,
      priority: index
    }));
    return {...assetOutcome, allocation: allocationsWithPriorities};
  }
}
export function outcomeAddPriorities(outcome: Outcome) {
  return outcome.map(assetOutcomeAddPriorities);
}
