import {utils, BigNumber, ethers} from 'ethers';
import {TransactionDescription} from 'ethers/lib/utils';

import {parseEventResult} from '../ethers-utils';
import AssetHolderArtifact from '../../artifacts/contracts/AssetHolder.sol/AssetHolder.json';
import NitroAdjudicatorArtifact from '../../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';

import {
  AllocationAssetOutcome,
  AllocationItem,
  AssetOutcome,
  decodeAllocation,
  decodeOutcome,
  isAllocationOutcome,
} from './outcome';
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
 * Takes an AllocationUpdatedEvent and the transaction that emittted it, and returns updated information in a convenient format.
 * Requires both an adjudicator and asset holder address.
 * @param assetHolderAddress
 * @param nitroAdjudicatorAddress
 * @param allocationUpdatedEvent
 * @param tx Transaction which gave rise to the event
 */
export function computeNewAssetOutcome(
  assetHolderAddress: Address,
  nitroAdjudicatorAddress: Address,
  allocationUpdatedEvent: {channelId: Bytes32; initialHoldings: string},
  tx?: ethers.Transaction
): {
  newAssetOutcome: AssetOutcome | '0x00'; // '0x00' if the outcome was deleted on chain
  newHoldings: BigNumber;
  externalPayouts: AllocationItem[];
  internalPayouts: AllocationItem[];
} {
  let oldAllocation;
  let indices = [];
  let txDescription: TransactionDescription;
  if (tx.to === assetHolderAddress) {
    txDescription = new ethers.Contract(
      assetHolderAddress,
      AssetHolderArtifact.abi
    ).interface.parseTransaction(tx);
    // originating tx may be on the supplied AssetHolder:
    // all methods have a parameter allocationBytes
    // transfer, transferAll, claim, claimAll
    oldAllocation = decodeAllocation(txDescription.args.allocationBytes);
    indices = txDescription.name == 'transfer' ? txDescription.args.indices : []; // TODO: claim does not use indices!
  } else if (tx.to === nitroAdjudicatorAddress) {
    // or it may have been on the NitroAdjudicator
    indices = []; // all the adjudicator methods use 'all'.
    // all methods have a parameter outcomeBytes
    // pushOutcomeAndTransferAll, concludePushOutcomeAndTransferAll
    txDescription = new ethers.Contract(
      nitroAdjudicatorAddress,
      NitroAdjudicatorArtifact.abi
    ).interface.parseTransaction(tx);
    const oldOutcome = decodeOutcome(txDescription.args.outcomeBytes); // We have the entire outcome here, extract the relevant AssetOutcome
    const assetOutcome = oldOutcome.find(
      outcome => outcome.assetHolderAddress === assetHolderAddress
    );
    if (isAllocationOutcome(assetOutcome)) {
      oldAllocation = assetOutcome.allocationItems;
    } else throw Error('No allocation for this asset holder');
  } else
    throw Error('transaction did not originate from either of the supplied contract addresses');

  const {newAllocation, deleted, payouts, totalPayouts} = computeNewAllocation(
    allocationUpdatedEvent.initialHoldings,
    oldAllocation,
    indices
  );
  const newHoldings = BigNumber.from(allocationUpdatedEvent.initialHoldings).sub(totalPayouts);
  const newAssetOutcome: AllocationAssetOutcome | '0x00' = deleted
    ? '0x00'
    : {
        assetHolderAddress: assetHolderAddress,
        allocationItems: newAllocation,
      };

  let hydratedPayouts: AllocationItem[];

  if (indices.length === 0) {
    hydratedPayouts = payouts.map((v, i) => ({
      destination: oldAllocation[i].destination,
      amount: v,
    }));
  } else {
    hydratedPayouts = payouts.map((v, i) => ({
      destination: oldAllocation[txDescription.args.indices[i]].destination,
      amount: v,
    }));
  }

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
