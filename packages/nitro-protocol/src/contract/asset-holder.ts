import {utils, BigNumber, ethers} from 'ethers';

import {parseEventResult} from '../ethers-utils';
import AssetHolderArtifact from '../../artifacts/contracts/AssetHolder.sol/AssetHolder.json';
import NitroAdjudicatorArtifact from '../../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';

import {
  AllocationAssetOutcome,
  AllocationItem,
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
  tx: ethers.Transaction
): {
  newAssetOutcome: AllocationAssetOutcome | '0x00'; // '0x00' if the outcome was deleted on chain
  newHoldings: BigNumber;
  externalPayouts: AllocationItem[];
  internalPayouts: AllocationItem[];
} {
  // Extract the calldata that we need
  const {oldAllocation, indices} = extractOldAllocationAndIndices(
    assetHolderAddress,
    nitroAdjudicatorAddress,
    tx
  );

  // Use the emulated, pure solidity function to figure out what the chain will have done
  const {newAllocation, deleted, payouts, totalPayouts} = computeNewAllocation(
    allocationUpdatedEvent.initialHoldings,
    oldAllocation,
    indices
  );

  // Massage the output for convenience
  const newHoldings = BigNumber.from(allocationUpdatedEvent.initialHoldings).sub(totalPayouts);
  const newAssetOutcome: AllocationAssetOutcome | '0x00' = deleted
    ? '0x00'
    : {
        assetHolderAddress: assetHolderAddress,
        allocationItems: newAllocation,
      };

  const longHandIndices =
    indices.length === 0
      ? Array.from(Array(payouts.length).keys()) // [0,1,2,...] all indices up to payouts.length
      : indices;

  const hydratedPayouts: AllocationItem[] = payouts.map((v, i) => ({
    destination: oldAllocation[longHandIndices[i]].destination,
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

/**
 *
 * Extracts the allocation and indices that were submitted in the calldata of the supplied transaction, which targeted a method on the Adjudicator or AssetHolder giving rise to an AllocationUpdated event.
 * The address of the relevant contract must be passed in the correct position in the parameters list of this function.
 * Requires both an adjudicator and asset holder address.
 * @param assetHolderAddress
 * @param nitroAdjudicatorAddress
 * @param tx Transaction which contained the allocation and indices
 */
function extractOldAllocationAndIndices(
  assetHolderAddress: Address,
  nitroAdjudicatorAddress: Address,
  tx: ethers.Transaction
): {
  oldAllocation: AllocationItem[];
  indices: number[];
} {
  let oldAllocation;
  let indices = [];
  // First, deduce which contract the tx targeted:

  if (tx.to === assetHolderAddress) {
    // If the originating tx targeted the supplied AssetHolder...

    const txDescription = new ethers.Contract(
      assetHolderAddress,
      AssetHolderArtifact.abi
    ).interface.parseTransaction(tx);

    // all methods (transfer, transferAll, claim, claimAll)
    // have a parameter allocationBytes:
    oldAllocation = decodeAllocation(txDescription.args.allocationBytes);
    indices = txDescription.name == 'transfer' ? txDescription.args.indices : []; // TODO: claim does not use indices!
  } else if (tx.to === nitroAdjudicatorAddress) {
    // If the originating tx targeted the supplied NitroAdjudicator...

    indices = []; // all the adjudicator methods use 'all'.

    const txDescription = new ethers.Contract(
      nitroAdjudicatorAddress,
      NitroAdjudicatorArtifact.abi
    ).interface.parseTransaction(tx);

    // all methods (pushOutcomeAndTransferAll, concludePushOutcomeAndTransferAll) have a parameter outcomeByte:
    const oldOutcome = decodeOutcome(txDescription.args.outcomeBytes);
    // We have the entire outcome here: we need to extract the relevant AssetOutcome
    const assetOutcome = oldOutcome.find(
      outcome => outcome.assetHolderAddress === assetHolderAddress
    );

    if (isAllocationOutcome(assetOutcome)) {
      oldAllocation = assetOutcome.allocationItems;
    } else throw Error('No allocation for this asset holder');
  } else
    throw Error('transaction did not originate from either of the supplied contract addresses');

  return {oldAllocation, indices};
}
function min(a: BigNumber, b: BigNumber) {
  return a.gt(b) ? b : a;
}
