import {
  Allocation as AppAllocation,
  Allocations as AppAllocations,
  AllocationItem as AppAllocationItem,
  DomainBudget as AppDomainBudget,
  TokenBudget,
  ChannelResult,
  ChannelStatus
} from '@statechannels/client-api-schema';
import {
  Allocation,
  AllocationItem,
  SimpleAllocation,
  DomainBudget,
  AssetBudget,
  isAllocation
} from '../../store/types';

import {AddressZero} from '@ethersproject/constants';
import {checkThat, exists, formatAmount, tokenAddress} from '../../utils';
import {BigNumber} from 'ethers';
import {ChannelStoreEntry} from '../../store/channel-store-entry';

export function serializeDomainBudget(budget: DomainBudget): AppDomainBudget {
  const budgets: TokenBudget[] = Object.keys(budget.forAsset).map(assetHolderAddress => {
    const assetBudget = checkThat<AssetBudget>(budget.forAsset[assetHolderAddress], exists);
    const channels = Object.keys(assetBudget.channels).map(channelId => ({
      channelId,
      amount: formatAmount(BigNumber.from(assetBudget.channels[channelId].amount))
    }));
    return {
      token: tokenAddress(assetHolderAddress) || AddressZero,
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
    amount: formatAmount(allocationItem.amount)
  };
}

export function serializeChannelEntry(channelEntry: ChannelStoreEntry): ChannelResult {
  const {
    latest: {appData, turnNum, outcome}, // TODO: This should be supported
    channelConstants: {participants, appDefinition},
    channelId
  } = channelEntry;

  if (!isAllocation(outcome)) {
    throw new Error('Can only send allocations to the app');
  }

  let status: ChannelStatus = 'running';
  if (turnNum.eq(0)) {
    status = 'proposed';
  } else if (turnNum.lt(2 * participants.length - 1)) {
    status = 'opening';
  } else if (channelEntry.hasConclusionProof) {
    status = 'closed';
  } else if (channelEntry.isSupported && channelEntry.supported.isFinal) {
    status = 'closing';
  }

  return {
    participants,
    allocations: serializeAllocation(outcome),
    appDefinition,
    appData,
    status,
    turnNum: formatAmount(turnNum),
    channelId
  };
}
