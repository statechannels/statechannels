import {
  Allocation as AppAllocation,
  Allocations as AppAllocations,
  AllocationItem as AppAllocationItem,
  SiteBudget as AppSiteBudget,
  TokenBudget
} from '@statechannels/client-api-schema';
import {
  Allocation,
  AllocationItem,
  SimpleAllocation,
  SiteBudget,
  AssetBudget
} from '../../store/types';
import {tokenAddress} from '../../constants';
import {AddressZero} from 'ethers/constants';
import {checkThat, exists} from '../../utils';
import {bigNumberify} from 'ethers/utils';

export function serializeSiteBudget(budget: SiteBudget): AppSiteBudget {
  const budgets: TokenBudget[] = Object.keys(budget.forAsset).map(assetHolderAddress => {
    const assetBudget = checkThat<AssetBudget>(budget.forAsset[assetHolderAddress], exists);
    const channels = Object.keys(assetBudget.channels).map(channelId => ({
      channelId,
      amount: bigNumberify(assetBudget.channels[channelId].amount).toHexString() // TODO: Malformed bignumber
    }));
    return {
      token: tokenAddress(assetHolderAddress) || AddressZero,
      availableReceiveCapacity: assetBudget.availableReceiveCapacity.toHexString(),
      availableSendCapacity: assetBudget.availableSendCapacity.toHexString(),
      channels
    };
  });

  return {
    domain: budget.domain,
    hubAddress: budget.hubAddress,
    budgets
  };
}

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
