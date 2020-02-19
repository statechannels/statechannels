import {bigNumberify} from 'ethers/utils';
import {
  AllocationItem,
  SimpleEthAllocation,
  Outcome,
  SimpleTokenAllocation,
  SimpleTokenGuarantee,
  MixedAllocation,
  SimpleEthGuarantee
} from '../store/types';
import _ from 'lodash';

const outcomeGuard = <T extends Outcome>(type: Outcome['type']) => (o: Outcome): o is T =>
  o.type === type;
export const isSimpleEthAllocation = outcomeGuard<SimpleEthAllocation>('SimpleEthAllocation');
export const isSimpleEthGuarantee = outcomeGuard<SimpleEthGuarantee>('SimpleEthGuarantee');
export const isSimpleTokenAllocation = outcomeGuard<SimpleTokenAllocation>('SimpleTokenAllocation');
export const isSimpleTokenGuarantee = outcomeGuard<SimpleTokenGuarantee>('SimpleTokenGuarantee');
export const isMixedAllocation = outcomeGuard<MixedAllocation>('MixedAllocation');

export const simpleEthAllocation = (...allocationItems: AllocationItem[]): SimpleEthAllocation => ({
  type: 'SimpleEthAllocation',
  allocationItems: _.cloneDeep(allocationItems)
});

export const simpleTokenAllocation = (
  tokenAddress: string,
  ...allocationItems: AllocationItem[]
): SimpleTokenAllocation => ({
  type: 'SimpleTokenAllocation',
  allocationItems: _.cloneDeep(allocationItems),
  tokenAddress
});

export const simpleEthGuarantee = (
  guarantorAddress: string,
  ...destinations: string[]
): SimpleEthGuarantee => ({
  type: 'SimpleEthGuarantee',
  destinations,
  guarantorAddress
});

export const simpleTokenGuarantee = (
  tokenAddress: string,
  guarantorAddress: string,
  ...destinations: string[]
): SimpleTokenGuarantee => ({
  type: 'SimpleTokenGuarantee',
  destinations,
  guarantorAddress,
  tokenAddress
});

export function updateAllocationOutcome<O extends SimpleEthAllocation | SimpleTokenAllocation>(
  outcome: O,
  allocationItems: AllocationItem[]
): O {
  return {
    ...outcome,
    allocationItems
  };
}

export enum Errors {
  DestinationMissing = 'Destination missing from ledger channel',
  InsufficientFunds = 'Insufficient funds in ledger channel',
  InvalidOutcomeType = 'Invalid outcome type'
}

type AllocationOutcome = SimpleEthAllocation | SimpleTokenAllocation;
export function allocateToTarget(
  currentOutcome: Outcome,
  deductions: readonly AllocationItem[],
  targetChannelId: string
): AllocationOutcome {
  if (
    currentOutcome.type !== 'SimpleEthAllocation' &&
    currentOutcome.type !== 'SimpleTokenAllocation'
  ) {
    throw new Error(Errors.InvalidOutcomeType);
  }

  currentOutcome = _.cloneDeep(currentOutcome);

  let total = bigNumberify(0);
  let currentItems = currentOutcome.allocationItems;

  deductions.forEach(targetItem => {
    const ledgerItem = currentItems.find(i => i.destination === targetItem.destination);
    if (!ledgerItem) throw new Error(Errors.DestinationMissing);

    total = total.add(targetItem.amount);
    ledgerItem.amount = ledgerItem.amount.sub(targetItem.amount);

    if (ledgerItem.amount.lt(0)) throw new Error(Errors.InsufficientFunds);
  });

  currentItems.push({destination: targetChannelId, amount: total});
  currentItems = currentItems.filter(i => i.amount.gt(0));

  currentOutcome.allocationItems = currentItems;
  return currentOutcome;
}
