import {
  Allocation as AppAllocation,
  Allocations as AppAllocations,
  AllocationItem as AppAllocationItem,
  SiteBudget as AppSiteBudget,
  BudgetRequest as AppBudgetRequest
} from '@statechannels/client-api-schema';
import {
  Allocation,
  AllocationItem,
  SimpleAllocation,
  SiteBudget,
  BudgetItem,
  AssetBudget
} from '../../store/types';
import {assetHolderAddress, ETH_ASSET_HOLDER_ADDRESS} from '../../constants';
import {bigNumberify} from 'ethers/utils';
import {AddressZero} from 'ethers/constants';
import {makeDestination} from '../../utils/outcome';

export function deserializeBudgetRequest(budgetRequest: AppBudgetRequest): SiteBudget {
  const assetBudget: AssetBudget = {
    assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
    inUse: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)},
    free: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)},
    pending: deserializeBudgetItem(budgetRequest),
    direct: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)}
  };
  return {
    site: budgetRequest.site,
    hubAddress: budgetRequest.hub.signingAddress,
    forAsset: {[ETH_ASSET_HOLDER_ADDRESS]: assetBudget}
  };
}

export function deserializeSiteBudget(siteBudget: AppSiteBudget): SiteBudget {
  const assetBudgets = siteBudget.budgets.map(b => ({
    assetHolderAddress: assetHolderAddress(b.token) || AddressZero,
    inUse: deserializeBudgetItem(b.inUse),
    free: deserializeBudgetItem(b.free),
    pending: deserializeBudgetItem(b.pending),
    direct: deserializeBudgetItem(b.direct)
  }));
  const budgets = {};
  assetBudgets.forEach(a => {
    budgets[a.assetHolderAddress] = a;
  });

  return {
    site: siteBudget.site,
    hubAddress: siteBudget.hub,
    forAsset: budgets
  };
}
export function deserializeBudgetItem(budgetItem: {
  playerAmount: string;
  hubAmount: string;
}): BudgetItem {
  return {
    playerAmount: bigNumberify(budgetItem.playerAmount),
    hubAmount: bigNumberify(budgetItem.hubAmount)
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
