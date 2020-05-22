import {
  AllocationItem,
  SimpleAllocation,
  SimpleGuarantee,
  Outcome,
  Allocation,
  Destination
} from '../store/types';
import {ETH_ASSET_HOLDER_ADDRESS} from '../config';
import _ from 'lodash';
import {BigNumber} from 'ethers';
import {ethers} from 'ethers';
import {checkThat} from './helpers';

export function isSimpleEthAllocation(outcome: Outcome): outcome is SimpleAllocation {
  return (
    outcome.type === 'SimpleAllocation' && outcome.assetHolderAddress === ETH_ASSET_HOLDER_ADDRESS
  );
}

export function assertSimpleEthAllocation(outcome: Outcome): SimpleAllocation {
  return checkThat(outcome, isSimpleEthAllocation);
}

export const simpleEthAllocation = (allocationItems: AllocationItem[]): SimpleAllocation => ({
  type: 'SimpleAllocation',
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  allocationItems
});

export const simpleEthGuarantee = (
  targetChannelId: string,
  ...destinations: string[]
): SimpleGuarantee => ({
  type: 'SimpleGuarantee',
  destinations,
  targetChannelId,
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS
});

export const simpleTokenAllocation = (
  assetHolderAddress,
  allocationItems: AllocationItem[]
): SimpleAllocation => ({
  type: 'SimpleAllocation',
  assetHolderAddress,
  allocationItems
});

export enum Errors {
  DestinationMissing = 'Destination missing from ledger channel',
  InsufficientFunds = 'Insufficient funds in ledger channel',
  InvalidOutcomeType = 'Invalid outcome type'
}

export function allocateToTarget(
  currentOutcome: Outcome,
  deductions: readonly AllocationItem[],
  targetChannelId: string
): Allocation {
  if (currentOutcome.type !== 'SimpleAllocation') {
    throw new Error(Errors.InvalidOutcomeType);
  }

  currentOutcome = _.cloneDeep(currentOutcome);

  let total = BigNumber.from(0);
  let currentItems = currentOutcome.allocationItems;

  deductions.forEach(targetItem => {
    const ledgerItem = currentItems.find(i => i.destination === targetItem.destination);
    if (!ledgerItem) {
      throw new Error(Errors.DestinationMissing);
    }

    total = total.add(targetItem.amount);
    ledgerItem.amount = ledgerItem.amount.sub(targetItem.amount);

    if (ledgerItem.amount.lt(0)) throw new Error(Errors.InsufficientFunds);
  });

  currentItems.push({destination: makeDestination(targetChannelId), amount: total});
  currentItems = currentItems.filter(i => i.amount.gt(0));

  currentOutcome.allocationItems = currentItems;
  return currentOutcome;
}

export function makeDestination(addressOrDestination: string): Destination {
  if (addressOrDestination.length === 42) {
    return ethers.utils.hexZeroPad(
      ethers.utils.getAddress(addressOrDestination),
      32
    ) as Destination;
  } else if (addressOrDestination.length === 66) {
    return addressOrDestination as Destination;
  } else {
    throw new Error('Invalid input');
  }
}
