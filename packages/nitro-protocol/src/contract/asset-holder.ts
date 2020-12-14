import {utils, BigNumber, ethers} from 'ethers';

import {parseEventResult} from '../ethers-utils';
import AssetHolderArtifact from '../../../artifacts/contracts/test/TESTAssetHolder.sol/TESTAssetHolder.json';

import {AllocationAssetOutcome, AllocationItem, AssetOutcome, decodeAllocation} from './outcome';
import {Address, Bytes32} from './types';
import {isExternalDestination} from './channel';

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
export function computeNewAllocation(
  initialHoldings: string,
  allocation: AllocationItem[], // we must index this with a JS number that is less than 2**32 - 1
  indices: number[]
): {newAllocation: AllocationItem[]; deleted: boolean; payouts: string[]; totalPayouts: string} {
  const payouts: string[] = Array(indices.length).fill(BigNumber.from(0).toHexString());
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

/**
 *
 * Takes an AllocationUpdatedEvent and the transaction that emittted it, and returns updated information in a convenient format
 * @param assetHolderAddress
 * @param allocationUpdatedEvent
 * @param tx Transaction which gave rise to the event
 */
export function computeNewAssetOutcome(
  assetHolderAddress: Address,
  allocationUpdatedEvent: {channelId: Bytes32; initialHoldings: string},
  tx: ethers.Transaction
): {
  newAssetOutcome: AssetOutcome | '0x00'; // '0x00' if the outcome was deleted on chain
  newHoldings: BigNumber;
  externalPayouts: AllocationItem[];
  internalPayouts: AllocationItem[];
} {
  const assetHolderContract = new ethers.Contract(assetHolderAddress, AssetHolderArtifact.abi);
  const txDescription = assetHolderContract.interface.parseTransaction(tx);
  const oldAllocation = decodeAllocation(txDescription.args.allocationBytes);

  const {newAllocation, deleted, payouts, totalPayouts} = computeNewAllocation(
    allocationUpdatedEvent.initialHoldings,
    oldAllocation,
    txDescription.args.indices
  );
  const newHoldings = BigNumber.from(allocationUpdatedEvent.initialHoldings).sub(totalPayouts);
  const newAssetOutcome: AllocationAssetOutcome | '0x00' = deleted
    ? '0x00'
    : {
        assetHolderAddress: assetHolderContract.address,
        allocationItems: newAllocation,
      };

  const hydratedPayouts: AllocationItem[] = payouts.map((v, i) => ({
    destination: oldAllocation[txDescription.args.indices[i]].destination,
    amount: v,
  }));

  const externalPayouts = hydratedPayouts.filter(payout =>
    isExternalDestination(payout.destination)
  );

  const internalPayouts = hydratedPayouts.filter(
    payout => !isExternalDestination(payout.destination)
  );
  return {newAssetOutcome, newHoldings, externalPayouts, internalPayouts};
}

function min(a: BigNumber, b: BigNumber) {
  return a.gt(b) ? b : a;
}
