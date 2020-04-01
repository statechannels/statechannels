import {
  Allocation as AppAllocation,
  Allocations as AppAllocations,
  AllocationItem as AppAllocationItem,
  SiteBudget as AppSiteBudget,
  TokenBudgetRequest as AppBudgetRequest
} from '@statechannels/client-api-schema';
import {
  Allocation,
  AllocationItem,
  SimpleAllocation,
  SiteBudget,
  AssetBudget
} from '../../store/types';
import {assetHolderAddress, ETH_ASSET_HOLDER_ADDRESS} from '../../constants';
import {bigNumberify} from 'ethers/utils';
import {AddressZero} from 'ethers/constants';
import {makeDestination} from '../../utils/outcome';

export function deserializeBudgetRequest(
  budgetRequest: AppBudgetRequest,
  domain: string
): SiteBudget {
  const assetBudget: AssetBudget = {
    assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
    availableSendCapacity: bigNumberify(budgetRequest.requestedSendCapacity),
    availableReceiveCapacity: bigNumberify(budgetRequest.requestedReceiveCapacity),
    channels: {}
  };
  return {
    domain,
    hubAddress: budgetRequest.hub.signingAddress,
    forAsset: {[ETH_ASSET_HOLDER_ADDRESS]: assetBudget}
  };
}

export function deserializeSiteBudget(siteBudget: AppSiteBudget): SiteBudget {
  const assetBudgets: AssetBudget[] = siteBudget.budgets.map(b => ({
    assetHolderAddress: assetHolderAddress(b.token) || AddressZero,
    availableReceiveCapacity: bigNumberify(b.availableReceiveCapacity),
    availableSendCapacity: bigNumberify(b.availableSendCapacity),
    channels: b.channels.reduce((record, item) => {
      record[item.channelId] = {amount: bigNumberify(item.amount)};
      return record;
    }, {})
  }));
  const budgets = assetBudgets.reduce((record, a) => {
    record[a.assetHolderAddress] = a;
    return record;
  }, {});

  return {
    domain: siteBudget.domain,
    hubAddress: siteBudget.hubAddress,
    forAsset: budgets
  };
}

export function deserializeAllocations(allocations: AppAllocations): Allocation {
  switch (allocations.length) {
    case 0:
      throw new Error('Allocations is empty');
    case 1:
      return deserializeAllocation(allocations[0]);
    default:
      return {
        type: 'MixedAllocation',
        simpleAllocations: allocations.map(deserializeAllocation)
      };
  }
}

function deserializeAllocation(allocation: AppAllocation): SimpleAllocation {
  const assetHolder = assetHolderAddress(allocation.token);
  if (!assetHolder) {
    throw new Error(`Can't find asset holder for token ${allocation.token}`);
  }

  return {
    type: 'SimpleAllocation',
    allocationItems: allocation.allocationItems.map(deserializeAllocationItem),
    assetHolderAddress: assetHolder
  };
}

function deserializeAllocationItem(allocationItem: AppAllocationItem): AllocationItem {
  return {
    destination: makeDestination(allocationItem.destination),
    amount: bigNumberify(allocationItem.amount)
  };
}
