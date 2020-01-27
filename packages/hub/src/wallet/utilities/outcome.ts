import {
  isAllocationOutcome,
  Outcome,
  AssetOutcome,
  isGuaranteeOutcome
} from '@statechannels/nitro-protocol';
import {unreachable} from '../../constants';

function assetOutcomeObjectToModel(assetOutcome: AssetOutcome) {
  if (isAllocationOutcome(assetOutcome)) {
    const allocationsWithPriorities = assetOutcome.allocation.map((allocationItem, index) => ({
      ...allocationItem,
      priority: index
    }));
    return {...assetOutcome, allocation: allocationsWithPriorities};
  } else if (isGuaranteeOutcome(assetOutcome)) {
    const guaranteeWithPriorities = assetOutcome.guarantee.destinations.map(
      (destination, index) => ({destination, priority: index})
    );
    return {
      assetHolderAddress: assetOutcome.assetHolderAddress,
      targetChannelId: assetOutcome.guarantee.targetChannelId,
      allocation: guaranteeWithPriorities
    };
  } else {
    return unreachable(assetOutcome);
  }
}
export function outcomeObjectToModel(outcome: Outcome) {
  return outcome.map(assetOutcomeObjectToModel);
}
