import {
  Outcome,
  isAllocationOutcome,
  AllocationItem,
  convertAddressToBytes32
} from "@statechannels/nitro-protocol";
import {AllocationAssetOutcome} from "@statechannels/nitro-protocol";
import {addHex} from "./hex-utils";

export function getAllocationAmountForIndex(outcome: Outcome, index: number): string {
  return getAllocationItemAtIndex(outcome, index).amount;
}

export function getAllocationAmount(outcome: Outcome, addressOrChannelId: string): string {
  return getAllocationItem(outcome, addressOrChannelId).amount;
}

export function getAllocationOutcome(outcome: Outcome): AllocationAssetOutcome {
  if (outcome.length !== 1) {
    throw new Error(
      `The wallet only works with outcomes of 1 asset type. Received ${outcome.length}.`
    );
  }
  const assetOutcome = outcome[0];
  if (!isAllocationOutcome(assetOutcome)) {
    throw new Error(`Expected an allocation outcome. Received ${assetOutcome}`);
  }
  return assetOutcome;
}

export function getAllocationTotal(outcome: Outcome): string {
  const allocationOutcome = getAllocationOutcome(outcome);
  const {allocation} = allocationOutcome;
  return allocation.map(a => a.amount).reduce(addHex);
}

export function getAllocationItem(outcome: Outcome, addressOrChannelId: string): AllocationItem {
  const paddedId =
    addressOrChannelId.length !== 66
      ? convertAddressToBytes32(addressOrChannelId)
      : addressOrChannelId;
  const allocationOutcome = getAllocationOutcome(outcome);
  const {allocation} = allocationOutcome;
  const allocationItem = allocation.find(a => a.destination === paddedId);
  if (!allocationItem) {
    throw new Error(`Could not find an allocation for ${paddedId}`);
  }
  return allocationItem;
}

export function getAllocationItemAtIndex(outcome: Outcome, index: number): AllocationItem {
  const allocationOutcome = getAllocationOutcome(outcome);
  const {allocation} = allocationOutcome;
  if (allocation.length < index) {
    throw new Error(
      `Attempting to get the allocation item at ${index} but allocation is only ${allocationOutcome.allocation.length} long.`
    );
  }
  return allocation[index];
}

export function outcomeContainsId(outcome: Outcome, addressOrChannelId: string): boolean {
  const paddedId =
    addressOrChannelId.length !== 66
      ? convertAddressToBytes32(addressOrChannelId)
      : addressOrChannelId;
  const allocationOutcome = getAllocationOutcome(outcome);
  const {allocation} = allocationOutcome;
  return allocation.some(a => a.destination === paddedId);
}
