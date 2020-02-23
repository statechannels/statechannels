import {
  Outcome,
  AssetOutcome,
  isAllocationOutcome,
  AllocationAssetOutcome
} from '@statechannels/nitro-protocol';

import {Allocations as TokenAllocations} from '@statechannels/client-api-schema';

import {ETH_TOKEN} from '../constants';
import {checkThat} from '../utils';

// TODO: Merge wallet-protocols/xstate-wallet so these are shared
export function getEthAllocation(
  outcome: Outcome,
  ethAssetHolderAddress: string
): TokenAllocations {
  const ethOutcome: AssetOutcome | undefined = outcome.find(
    o => o.assetHolderAddress === ethAssetHolderAddress
  );
  if (!ethOutcome) {
    return [];
  }
  return [
    {
      token: ETH_TOKEN,
      allocationItems: checkThat(ethOutcome, isAllocationOutcome).allocationItems
    }
  ];
}

export function ethAllocationOutcome(
  allocations: TokenAllocations,
  ethAssetHolderAddress: string
): AllocationAssetOutcome[] {
  const ethAllocation = allocations.find(e => e.token === ETH_TOKEN);
  if (!ethAllocation) {
    return [];
  }
  return [
    {
      assetHolderAddress: ethAssetHolderAddress,
      allocationItems: ethAllocation.allocationItems
    }
  ];
}
