import {
  SingleAssetOutcome as AppSingleAssetOutcome,
  Allocation as AppAllocation,
  DomainBudget as AppDomainBudget,
  TokenBudget,
  Outcome as AppOutcome
} from '@statechannels/client-api-schema';
import {constants} from 'ethers';
import {AllocationType} from '@statechannels/exit-format';

import {Allocation, DomainBudget, AssetBudget, SingleAssetOutcome, Outcome} from '../../types';
import {checkThat, exists, formatAmount} from '../../utils';
import {BN} from '../../bignumber';

export function serializeDomainBudget(budget: DomainBudget): AppDomainBudget {
  const budgets: TokenBudget[] = Object.keys(budget.forAsset).map(asset => {
    const assetBudget = checkThat<AssetBudget>(budget.forAsset[asset], exists);
    const channels = Object.keys(assetBudget.channels).map(channelId => ({
      channelId,
      amount: formatAmount(BN.from(assetBudget.channels[channelId].amount))
    }));
    return {
      asset: asset || constants.AddressZero,
      availableReceiveCapacity: formatAmount(assetBudget.availableReceiveCapacity),
      availableSendCapacity: formatAmount(assetBudget.availableSendCapacity),
      channels
    };
  });

  return {
    domain: budget.domain,
    hubAddress: budget.hubAddress,
    budgets
  };
}

export function serializeAllocations(allocations: Allocation[]): AppAllocation[] {
  return allocations.map(serializeAllocation);
}

function serializeAllocation(allocation: Allocation): AppAllocation {
  return {
    destination: allocation.destination,
    amount: formatAmount(allocation.amount),
    metadata: allocation.metadata ?? '0x',
    allocationType: allocation.allocationType ?? AllocationType.simple
  };
}

export function serializeSingleAssetOutcome(
  singleAssetOutcome: SingleAssetOutcome
): AppSingleAssetOutcome {
  return {
    asset: singleAssetOutcome.asset,
    metadata: singleAssetOutcome.metadata ?? '0x',
    allocations: singleAssetOutcome.allocations.map(serializeAllocation)
  };
}

export function serializeOutcome(outcome: Outcome): AppOutcome {
  return outcome.map(serializeSingleAssetOutcome);
}
