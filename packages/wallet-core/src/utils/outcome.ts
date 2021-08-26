import * as _ from 'lodash';
import {ethers} from 'ethers';
import {AllocationType} from '@statechannels/exit-format';

import {Allocation, Destination, makeAddress, SingleAssetOutcome, Address} from '../types';
import {BN, Zero} from '../bignumber';
import {zeroAddress} from '../config';

export const ethOutcome = (allocations: Allocation[]): SingleAssetOutcome => ({
  asset: zeroAddress,
  allocations,
  metadata: '0x'
});

export const tokenAllocation = (asset: Address, allocations: Allocation[]): SingleAssetOutcome => ({
  asset,
  allocations,
  metadata: '0x'
});

export enum Errors {
  DestinationMissing = 'Destination missing from ledger channel',
  InsufficientFunds = 'Insufficient funds in ledger channel',
  InvalidOutcomeType = 'Invalid outcome type'
}

export const areAllocationsEqual = (a: Allocation, b: Allocation): boolean =>
  a.destination === b.destination && BN.eq(a.amount, b.amount);

export function allocateToTarget(
  currentOutcome: SingleAssetOutcome,
  deductions: readonly Allocation[],
  targetChannelId: string
): SingleAssetOutcome {
  currentOutcome = _.cloneDeep(currentOutcome);

  let total = Zero;
  let currentAllocations = currentOutcome.allocations;

  deductions
    .filter(i => BN.gt(i.amount, 0))
    .forEach(targetItem => {
      const ledgerItem = currentAllocations.find(i => i.destination === targetItem.destination);
      if (!ledgerItem) {
        throw new Error(Errors.DestinationMissing);
      }

      total = BN.add(total, targetItem.amount);
      ledgerItem.amount = BN.sub(ledgerItem.amount, targetItem.amount);

      if (BN.lt(ledgerItem.amount, 0)) throw new Error(Errors.InsufficientFunds);
    });

  currentAllocations.push({
    amount: total,
    destination: makeDestination(targetChannelId),
    metadata: '0x',
    allocationType: AllocationType.simple
  });
  currentAllocations = currentAllocations.filter(i => BN.gt(i.amount, 0));

  currentOutcome.allocations = currentAllocations;
  return currentOutcome;
}

export function makeDestination(addressOrDestination: string): Destination {
  // '0x' + 20 byte ethereum address and 0x
  const addressLength = 20 * 2 + 2;
  // '0x' + 32 bytes
  const destinationLength = 32 * 2 + 2;
  const zeroPrefix =
    '0x' + _.range(destinationLength - addressLength).reduce(soFar => soFar.concat('0'), '');

  // If an ethereum address is passed in, prepend 0s
  if (addressOrDestination.length === addressLength) {
    return ethers.utils.hexZeroPad(makeAddress(addressOrDestination), 32) as Destination;
    // The full length destination might be a channel ID or an ethereum address prepended with 0s
  } else if (addressOrDestination.length === destinationLength) {
    // This is an etherum address prepended with 0s
    // Checksum the address
    if (addressOrDestination.startsWith(zeroPrefix)) {
      return ethers.utils.hexZeroPad(
        makeAddress(addressOrDestination.substr(zeroPrefix.length)),
        32
      ) as Destination;
    }
    return addressOrDestination.toLowerCase() as Destination;
  } else {
    throw new Error('Invalid input');
  }
}
