import {utils, BigNumber, ethers} from 'ethers';
import ExitFormat from '@statechannels/exit-format';

import {parseEventResult} from '../ethers-utils';
import NitroAdjudicatorArtifact from '../../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';

import {isExternalDestination} from './channel';
import {
  AssetOutcome,
  decodeGuaranteeData,
  decodeOutcome,
  GuaranteeAllocation,
  Outcome,
} from './outcome';
import {Address, Bytes32, Uint256} from './types';

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
  allocations: ExitFormat.Allocation[], // we must index this with a JS number that is less than 2**32 - 1
  indices: number[],
  guarantee: GuaranteeAllocation
): {
  newAllocations: ExitFormat.Allocation[];
  allocatesOnlyZeros: boolean;
  payouts: string[];
  totalPayouts: string;
} {
  const payouts: string[] = Array(indices.length > 0 ? indices.length : allocations.length).fill(
    BigNumber.from(0).toHexString()
  );
  let totalPayouts = BigNumber.from(0);
  let allocatesOnlyZeros = true;
  let surplus = BigNumber.from(initialHoldings);
  let k = 0;

  // copy allocation
  const newAllocations: ExitFormat.Allocation[] = [];
  for (let i = 0; i < allocations.length; i++) {
    newAllocations.push({
      destination: allocations[i].destination,
      amount: allocations[i].amount,
      metadata: allocations[i].metadata,
      allocationType: allocations[i].allocationType,
    });
  }

  const guaranteeDestinations = decodeGuaranteeData(guarantee.metadata);

  // for each guarantee destination
  for (let j = 0; j < guaranteeDestinations.length; j++) {
    if (surplus.isZero()) break;
    for (let i = 0; i < newAllocations.length; i++) {
      if (surplus.isZero()) break;
      // search for it in the allocation
      if (
        BigNumber.from(guaranteeDestinations[j]).eq(BigNumber.from(newAllocations[i].destination))
      ) {
        // if we find it, compute new amount
        const affordsForDestination = min(BigNumber.from(newAllocations[i].amount), surplus);
        // decrease surplus by the current amount regardless of hitting a specified index
        surplus = surplus.sub(affordsForDestination);
        if (indices.length === 0 || (k < indices.length && indices[k] === i)) {
          // only if specified in supplied indices, or we if we are doing "all"
          // reduce the current allocationItem.amount
          newAllocations[i].amount = BigNumber.from(newAllocations[i].amount)
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

  for (let i = 0; i < allocations.length; i++) {
    if (!BigNumber.from(newAllocations[i].amount).isZero()) {
      allocatesOnlyZeros = false;
      break;
    }
  }

  return {
    newAllocations,
    allocatesOnlyZeros,
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
  allocations: ExitFormat.Allocation[], // we must index this with a JS number that is less than 2**32 - 1
  indices: number[]
): {
  newAllocations: ExitFormat.Allocation[];
  allocatesOnlyZeros: boolean;
  payouts: string[];
  totalPayouts: string;
} {
  const payouts: string[] = Array(indices.length > 0 ? indices.length : allocations.length).fill(
    BigNumber.from(0).toHexString()
  );
  let totalPayouts = BigNumber.from(0);
  const newAllocations: ExitFormat.Allocation[] = [];
  let allocatesOnlyZeros = true;
  let surplus = BigNumber.from(initialHoldings);
  let k = 0;

  for (let i = 0; i < allocations.length; i++) {
    newAllocations.push({
      destination: allocations[i].destination,
      amount: BigNumber.from(0).toHexString(),
      metadata: allocations[i].metadata,
      allocationType: allocations[i].allocationType,
    });
    const affordsForDestination = min(BigNumber.from(allocations[i].amount), surplus);
    if (indices.length == 0 || (k < indices.length && indices[k] === i)) {
      newAllocations[i].amount = BigNumber.from(allocations[i].amount)
        .sub(affordsForDestination)
        .toHexString();
      payouts[k] = affordsForDestination.toHexString();
      totalPayouts = totalPayouts.add(affordsForDestination);
      ++k;
    } else {
      newAllocations[i].amount = allocations[i].amount;
    }
    if (!BigNumber.from(newAllocations[i].amount).isZero()) allocatesOnlyZeros = false;
    surplus = surplus.sub(affordsForDestination);
  }

  return {
    newAllocations,
    allocatesOnlyZeros,
    payouts,
    totalPayouts: totalPayouts.toHexString(),
  };
}

/**
 *
 * Takes a AllocationUpdated Event and the transaction that emittted it, and returns updated information in a convenient format.
 * @param nitroAdjudicatorAddress
 * @param allocationUpdatedEvent
 * @param tx Transaction which gave rise to the event
 */
export function computeNewOutcome(
  nitroAdjudicatorAddress: Address,
  allocationUpdatedEvent: {channelId: Bytes32; assetIndex: Uint256; initialHoldings: string},
  tx: ethers.Transaction
): {
  assetIndex: number;
  newOutcome: Outcome;
  newHoldings: BigNumber;
  externalPayouts: ExitFormat.Allocation[];
  internalPayouts: ExitFormat.Allocation[];
} {
  // Extract the calldata that we need
  const {oldOutcome, indices, guarantee} = extractOldOutcomeAndIndices(nitroAdjudicatorAddress, tx);
  const assetIndex = BigNumber.from(allocationUpdatedEvent.assetIndex).toNumber();
  const oldAllocations = oldOutcome[assetIndex].allocations;

  // Use the emulated, pure solidity functions to figure out what the chain will have done
  const {newAllocations, payouts, totalPayouts} = guarantee
    ? computeNewAllocationWithGuarantee(
        allocationUpdatedEvent.initialHoldings,
        oldAllocations,
        indices,
        guarantee
      ) // if guarantee is defined, then we know that claim was called
    : computeNewAllocation(allocationUpdatedEvent.initialHoldings, oldAllocations, indices);

  // Massage the output for convenience
  const newHoldings = BigNumber.from(allocationUpdatedEvent.initialHoldings).sub(totalPayouts);
  const newAssetOutcome: AssetOutcome = {
    asset: oldOutcome[assetIndex].asset,
    allocations: newAllocations,
    metadata: oldOutcome[assetIndex].metadata,
  };

  const longHandIndices =
    indices.length === 0
      ? Array.from(Array(payouts.length).keys()) // [0,1,2,...] all indices up to payouts.length
      : indices;

  const hydratedPayouts: ExitFormat.Allocation[] = payouts.map((v, i) => ({
    destination: oldAllocations[longHandIndices[i]].destination,
    amount: v,
    allocationType: oldAllocations[longHandIndices[i]].allocationType,
    metadata: oldAllocations[longHandIndices[i]].metadata,
  }));

  const externalPayouts = hydratedPayouts.filter(payout =>
    isExternalDestination(payout.destination)
  );

  const internalPayouts = hydratedPayouts.filter(
    payout => !isExternalDestination(payout.destination)
  );

  const newOutcome = {...oldOutcome};
  newOutcome[assetIndex] = newAssetOutcome;
  return {assetIndex, newOutcome, newHoldings, externalPayouts, internalPayouts};
}

/**
 * Extracts the outcome, assetIndex and indices that were submitted in the calldata of the supplied transaction, which targeted a method on the Adjudicator giving rise to a AllocationUpdated event.
 * @param nitroAdjudicatorAddress
 * @param tx Transaction which contained the allocation and indices
 */
function extractOldOutcomeAndIndices(
  nitroAdjudicatorAddress: Address,
  tx: ethers.Transaction
): {
  oldOutcome: Outcome;
  assetIndex: number | undefined; // undefined meaning "all assets"
  indices: number[];
  guarantee: GuaranteeAllocation | undefined;
} {
  let indices = [];
  let guarantee: GuaranteeAllocation | undefined = undefined;

  const txDescription = new ethers.Contract(
    nitroAdjudicatorAddress,
    NitroAdjudicatorArtifact.abi
  ).interface.parseTransaction(tx);

  // all methods (transfer, transferAll, claim, claimAll)
  // have a parameter outcomeBytes:
  const oldOutcome = decodeOutcome(txDescription.args.outcomeBytes);

  if (txDescription.name === 'claim') {
    guarantee = decodeOutcome(txDescription.args.guarantee)[txDescription.args.assetIndex]
      .allocations[txDescription.args.targetChannelIndex] as GuaranteeAllocation;
  }
  indices =
    txDescription.name === 'transfer' || txDescription.name == 'claim'
      ? txDescription.args.indices
      : [];

  const assetIndex =
    txDescription.name === 'transfer' || txDescription.name == 'claim'
      ? txDescription.args.assetIndex
      : undefined;

  return {oldOutcome, assetIndex, indices, guarantee};
}

function min(a: BigNumber, b: BigNumber) {
  return a.gt(b) ? b : a;
}
