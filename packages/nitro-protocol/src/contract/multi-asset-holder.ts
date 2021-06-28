import {utils, BigNumber} from 'ethers';

import {parseEventResult} from '../ethers-utils';

import {AllocationItem, Guarantee} from './outcome';
export interface DepositedEvent {
  destination: string;
  amountDeposited: BigNumber;
  destinationHoldings: BigNumber;
}

export function getDepositedEvent(eventResult: any[]): DepositedEvent {
  const {destination, amountDeposited, destinationHoldings} = parseEventResult(eventResult);
  return {
    destination,
    amountDeposited: BigNumber.from(amountDeposited),
    destinationHoldings: BigNumber.from(destinationHoldings),
  };
}

export function convertBytes32ToAddress(bytes32: string): string {
  const normalized = utils.hexZeroPad(bytes32, 32);
  return utils.getAddress(`0x${normalized.slice(-40)}`);
}

// e.g.,
// 0x9546E319878D2ca7a21b481F873681DF344E0Df8 becomes
// 0x0000000000000000000000009546E319878D2ca7a21b481F873681DF344E0Df8
export function convertAddressToBytes32(address: string): string {
  const normalizedAddress = BigNumber.from(address).toHexString();
  if (!utils.isAddress(address)) {
    throw new Error(`Input is not a valid Ethereum address.`);
  }

  // We pad to 66 = (32*2) + 2('0x')
  return utils.hexZeroPad(normalizedAddress, 32);
}

/**
 *
 * Emulates solidity code. TODO replace with PureEVM implementation?
 * @param initialHoldings
 * @param allocation
 * @param indices
 */
export function computeNewAllocationWithGuarantee(
  initialHoldings: string,
  allocation: AllocationItem[], // we must index this with a JS number that is less than 2**32 - 1
  indices: number[],
  guarantee: Guarantee
): {newAllocation: AllocationItem[]; deleted: boolean; payouts: string[]; totalPayouts: string} {
  const payouts: string[] = Array(indices.length > 0 ? indices.length : allocation.length).fill(
    BigNumber.from(0).toHexString()
  );
  let totalPayouts = BigNumber.from(0);
  let safeToDelete = true;
  let surplus = BigNumber.from(initialHoldings);
  let k = 0;

  // copy allocation
  const newAllocation: AllocationItem[] = [];
  for (let i = 0; i < allocation.length; i++) {
    newAllocation.push({
      destination: allocation[i].destination,
      amount: allocation[i].amount,
    });
  }

  // for each guarantee destination
  for (let j = 0; j < guarantee.destinations.length; j++) {
    if (surplus.isZero()) break;
    for (let i = 0; i < newAllocation.length; i++) {
      if (surplus.isZero()) break;
      // search for it in the allocation
      if (
        BigNumber.from(guarantee.destinations[j]).eq(BigNumber.from(newAllocation[i].destination))
      ) {
        // if we find it, compute new amount
        const affordsForDestination = min(BigNumber.from(newAllocation[i].amount), surplus);
        // decrease surplus by the current amount regardless of hitting a specified index
        surplus = surplus.sub(affordsForDestination);
        if (indices.length === 0 || (k < indices.length && indices[k] === i)) {
          // only if specified in supplied indices, or we if we are doing "all"
          // reduce the current allocationItem.amount
          newAllocation[i].amount = BigNumber.from(newAllocation[i].amount)
            .sub(affordsForDestination)
            .toHexString();
          // increase the relevant payout
          payouts[k] = affordsForDestination.toHexString();
          totalPayouts = totalPayouts.add(affordsForDestination);
          ++k;
        }
        break;
      }
    }
  }

  for (let i = 0; i < allocation.length; i++) {
    if (!BigNumber.from(newAllocation[i].amount).isZero()) {
      safeToDelete = false;
      break;
    }
  }

  return {
    newAllocation,
    deleted: safeToDelete,
    payouts,
    totalPayouts: totalPayouts.toHexString(),
  };
}

/**
 *
 * Emulates solidity code. TODO replace with PureEVM implementation?
 * @param initialHoldings
 * @param allocation
 * @param indices
 */
export function computeNewAllocation(
  initialHoldings: string,
  allocation: AllocationItem[], // we must index this with a JS number that is less than 2**32 - 1
  indices: number[]
): {newAllocation: AllocationItem[]; deleted: boolean; payouts: string[]; totalPayouts: string} {
  const payouts: string[] = Array(indices.length > 0 ? indices.length : allocation.length).fill(
    BigNumber.from(0).toHexString()
  );
  let totalPayouts = BigNumber.from(0);
  const newAllocation: AllocationItem[] = [];
  let safeToDelete = true;
  let surplus = BigNumber.from(initialHoldings);
  let k = 0;

  for (let i = 0; i < allocation.length; i++) {
    newAllocation.push({
      destination: allocation[i].destination,
      amount: BigNumber.from(0).toHexString(),
    });
    const affordsForDestination = min(BigNumber.from(allocation[i].amount), surplus);
    if (indices.length == 0 || (k < indices.length && indices[k] === i)) {
      newAllocation[i].amount = BigNumber.from(allocation[i].amount)
        .sub(affordsForDestination)
        .toHexString();
      payouts[k] = affordsForDestination.toHexString();
      totalPayouts = totalPayouts.add(affordsForDestination);
      ++k;
    } else {
      newAllocation[i].amount = allocation[i].amount;
    }
    if (!BigNumber.from(newAllocation[i].amount).isZero()) safeToDelete = false;
    surplus = surplus.sub(affordsForDestination);
  }

  return {
    newAllocation,
    deleted: safeToDelete,
    payouts,
    totalPayouts: totalPayouts.toHexString(),
  };
}

function min(a: BigNumber, b: BigNumber) {
  return a.gt(b) ? b : a;
}
