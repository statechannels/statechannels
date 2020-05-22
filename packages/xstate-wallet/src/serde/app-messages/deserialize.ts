import {
  Allocation as AppAllocation,
  Allocations as AppAllocations,
  AllocationItem as AppAllocationItem,
  DomainBudget as AppDomainBudget,
  TokenBudgetRequest as AppBudgetRequest
} from '@statechannels/client-api-schema';
import {
  Allocation,
  AllocationItem,
  SimpleAllocation,
  DomainBudget,
  AssetBudget
} from '../../store/types';
import {ETH_ASSET_HOLDER_ADDRESS} from '../../config';
import {BigNumber} from 'ethers';
import {AddressZero} from '@ethersproject/constants';
import {makeDestination, assetHolderAddress} from '../../utils';

export function deserializeBudgetRequest(
  budgetRequest: AppBudgetRequest,
  domain: string
): DomainBudget {
  const assetBudget: AssetBudget = {
    assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
    availableSendCapacity: BigNumber.from(budgetRequest.requestedSendCapacity),
    availableReceiveCapacity: BigNumber.from(budgetRequest.requestedReceiveCapacity),
    channels: {}
  };
  return {
    domain,
    hubAddress: budgetRequest.hub.signingAddress,
    forAsset: {[ETH_ASSET_HOLDER_ADDRESS]: assetBudget}
  };
}

export function deserializeDomainBudget(DomainBudget: AppDomainBudget): DomainBudget {
  const assetBudgets: AssetBudget[] = DomainBudget.budgets.map(b => ({
    assetHolderAddress: assetHolderAddress(b.token) || AddressZero,
    availableReceiveCapacity: BigNumber.from(b.availableReceiveCapacity),
    availableSendCapacity: BigNumber.from(b.availableSendCapacity),
    channels: b.channels.reduce((record, item) => {
      record[item.channelId] = {amount: BigNumber.from(item.amount)};
      return record;
    }, {})
  }));
  const budgets = assetBudgets.reduce((record, a) => {
    record[a.assetHolderAddress] = a;
    return record;
  }, {});

  return {
    domain: DomainBudget.domain,
    hubAddress: DomainBudget.hubAddress,
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
    amount: BigNumber.from(allocationItem.amount)
  };
}
