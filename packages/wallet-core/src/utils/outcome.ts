import * as _ from 'lodash';
import {ethers} from 'ethers';

import {
  AllocationItem,
  SimpleAllocation,
  SimpleGuarantee,
  Outcome,
  Allocation,
  Destination
} from '../types';
import {ETH_ASSET_HOLDER_ADDRESS} from '../config';
import {BN, Zero} from '../bignumber';

import {checkThat} from './helpers';

export function isSimpleAllocation(outcome: Outcome): outcome is SimpleAllocation {
  return outcome.type === 'SimpleAllocation';
}

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
  assetHolderAddress: string,
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

export const areAllocationItemsEqual = (a: AllocationItem, b: AllocationItem): boolean =>
  a.destination === b.destination && BN.eq(a.amount, b.amount);

export function allocateToTarget(
  currentOutcome: Outcome,
  deductions: readonly AllocationItem[],
  targetChannelId: string
): Allocation {
  if (currentOutcome.type !== 'SimpleAllocation') {
    throw new Error(Errors.InvalidOutcomeType);
  }

  currentOutcome = _.cloneDeep(currentOutcome);

  let total = Zero;
  let currentItems = currentOutcome.allocationItems;

  deductions.forEach(targetItem => {
    const ledgerItem = currentItems.find(i => i.destination === targetItem.destination);
    if (!ledgerItem) {
      throw new Error(Errors.DestinationMissing);
    }

    total = BN.add(total, targetItem.amount);
    ledgerItem.amount = BN.sub(ledgerItem.amount, targetItem.amount);

    if (BN.lt(ledgerItem.amount, 0)) throw new Error(Errors.InsufficientFunds);
  });

  currentItems.push({destination: makeDestination(targetChannelId), amount: total});
  currentItems = currentItems.filter(i => BN.gt(i.amount, 0));

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
