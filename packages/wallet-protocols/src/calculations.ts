import {
  Allocation,
  AllocationAssetOutcome,
  AssetOutcome,
  Guarantee,
  GuaranteeAssetOutcome,
  Outcome,
  isAllocationOutcome,
} from '@statechannels/nitro-protocol';
import { hexZeroPad } from 'ethers/utils';

import { add, gt, subtract } from './mathOps';

import { checkThat } from '.';

export enum Errors {
  DestinationMissing = 'Destination missing from ledger channel',
  InsufficientFunds = 'Insufficient funds in ledger channel',
}

export function allocateToTarget(
  ledgerAllocation: Allocation,
  deductions: Allocation,
  targetChannelId: string,
  ethAssetHolderAddress: string
): Outcome {
  let total = '0';

  deductions.forEach(targetItem => {
    const ledgerIdx = ledgerAllocation.findIndex(
      ledgerItem => ledgerItem.destination === targetItem.destination
    );
    if (ledgerIdx === -1) {
      throw new Error(Errors.DestinationMissing);
    }
    let ledgerItem = ledgerAllocation[ledgerIdx];
    try {
      ledgerItem = {
        destination: ledgerItem.destination,
        amount: subtract(ledgerItem.amount, targetItem.amount),
      };
    } catch (e) {
      if (e.message === 'Unsafe subtraction') {
        throw new Error(Errors.InsufficientFunds);
      } else {
        throw e;
      }
    }
    total = add(total, targetItem.amount);
    if (gt(ledgerItem.amount, 0)) {
      ledgerAllocation[ledgerIdx] = ledgerItem;
    } else {
      ledgerAllocation.splice(ledgerIdx, 1);
    }
  });
  ledgerAllocation.push({ destination: targetChannelId, amount: total });
  return ethAllocationOutcome(ledgerAllocation, ethAssetHolderAddress);
}

export function getEthAllocation(outcome: Outcome, ethAssetHolderAddress: string): Allocation {
  const ethOutcome: AssetOutcome | undefined = outcome.find(
    o => o.assetHolderAddress === ethAssetHolderAddress
  );
  return ethOutcome ? checkThat(ethOutcome, isAllocationOutcome).allocationItems : [];
}

export function ethAllocationOutcome(
  allocation: Allocation,
  ethAssetHolderAddress: string
): AllocationAssetOutcome[] {
  // If there are allocations then we use a blank outcomes
  if (allocation.length === 0) {
    return [];
  }
  return [
    {
      // FIXME: Fix hard-coded asset holder address
      assetHolderAddress: ethAssetHolderAddress,
      allocationItems: allocation.map(a => ({ ...a, destination: hexZeroPad(a.destination, 32) })),
    },
  ];
}

export function ethGuaranteeOutcome(
  guarantee: Guarantee,
  ethAssetHolderAddress: string
): GuaranteeAssetOutcome[] {
  return [
    {
      // FIXME: Fix hard-coded asset holder address
      assetHolderAddress: ethAssetHolderAddress,
      guarantee,
    },
  ];
}
