import {
  Allocation as AppAllocation,
  SingleAssetOutcome as AppSingleAssetOutcome,
  DomainBudget as AppDomainBudget,
  Outcome as AppOutcome,
  ApproveBudgetAndFundParams as AppBudgetRequest
} from '@statechannels/client-api-schema';
import {constants} from 'ethers';

import {
  Allocation,
  DomainBudget,
  AssetBudget,
  makeAddress,
  SingleAssetOutcome,
  Outcome
} from '../../types';
import {BN} from '../../bignumber';
import {makeDestination} from '../../utils';
import {zeroAddress} from '../../config';

export function deserializeBudgetRequest(
  budgetRequest: AppBudgetRequest,
  domain: string
): DomainBudget {
  const assetBudget: AssetBudget = {
    asset: zeroAddress,
    availableSendCapacity: BN.from(budgetRequest.requestedSendCapacity),
    availableReceiveCapacity: BN.from(budgetRequest.requestedReceiveCapacity),
    channels: {}
  };
  return {
    domain,
    hubAddress: budgetRequest.hub.signingAddress,
    forAsset: {[zeroAddress]: assetBudget}
  };
}

export function deserializeDomainBudget(DomainBudget: AppDomainBudget): DomainBudget {
  const assetBudgets: AssetBudget[] = DomainBudget.budgets.map(b => ({
    asset: b.asset || constants.AddressZero,
    availableReceiveCapacity: BN.from(b.availableReceiveCapacity),
    availableSendCapacity: BN.from(b.availableSendCapacity),
    channels: b.channels.reduce((record, item) => {
      record[item.channelId] = {amount: BN.from(item.amount)};
      return record;
    }, {})
  }));
  const budgets = assetBudgets.reduce((record, a) => {
    record[a.asset] = a;
    return record;
  }, {});

  return {
    domain: DomainBudget.domain,
    hubAddress: DomainBudget.hubAddress,
    forAsset: budgets
  };
}

export function deserializeAllocations(allocations: AppAllocation[]): Allocation[] {
  return allocations.map(deserializeAllocation);
}

export function deserializeSingleAssetOutcome(
  singleAssetOutcome: AppSingleAssetOutcome
): SingleAssetOutcome {
  return {
    allocations: singleAssetOutcome.allocations.map(deserializeAllocation),
    asset: makeAddress(singleAssetOutcome.asset),
    metadata: singleAssetOutcome.metadata
  };
}

export function deserializeOutcome(outcome: AppOutcome): Outcome {
  return outcome.map(deserializeSingleAssetOutcome);
}

function deserializeAllocation(allocation: AppAllocation): Allocation {
  return {
    destination: makeDestination(allocation.destination),
    amount: BN.from(allocation.amount),
    metadata: allocation.metadata,
    allocationType: allocation.allocationType
  };
}
