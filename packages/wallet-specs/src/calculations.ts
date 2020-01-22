import { Outcome, Allocation } from '@statechannels/nitro-protocol';

import { ethAllocationOutcome, add, subtract, gt } from '.';
export enum Errors {
  DestinationMissing = 'Destination missing from ledger channel',
  InsufficientFunds = 'Insufficient funds in ledger channel',
}

export function allocateToTarget(
  targetAllocation: Allocation,
  ledgerAllocation: Allocation,
  targetChannelId: string
): Outcome {
  let total = '0';

  targetAllocation.forEach(targetItem => {
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
  return ethAllocationOutcome(ledgerAllocation);
}
