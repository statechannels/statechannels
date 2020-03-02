import {
  Allocation as AppAllocation,
  Allocations as AppAllocations,
  AllocationItem as AppAllocationItem
} from '@statechannels/client-api-schema';
import {Allocation, AllocationItem, SimpleAllocation} from '../../store/types';
import {tokenAddress} from '../../constants';

export function serializeAllocation(allocation: Allocation): AppAllocations {
  switch (allocation.type) {
    case 'SimpleAllocation':
      return [serializeSimpleAllocation(allocation)];
    case 'MixedAllocation':
      return allocation.simpleAllocations.map(serializeSimpleAllocation);
  }
}

function serializeSimpleAllocation(allocation: SimpleAllocation): AppAllocation {
  const token = tokenAddress(allocation.assetHolderAddress);
  if (!token) {
    throw new Error(`Can't find token address for asset holder ${allocation.assetHolderAddress}`);
  }

  return {
    allocationItems: allocation.allocationItems.map(serializeAllocationItem),
    token
  };
}

function serializeAllocationItem(allocationItem: AllocationItem): AppAllocationItem {
  return {
    destination: allocationItem.destination,
    amount: allocationItem.amount.toHexString()
  };
}
