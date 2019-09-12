import {defaultAbiCoder, keccak256} from 'ethers/utils';
import {Bytes32, Address, Uint256} from './types';

export enum OutcomeType {
  AllocationOutcomeType = 0,
  GuaranteeOutcomeType = 1,
}

// Guarantee and functions
export interface Guarantee {
  guaranteedChannelAddress: Bytes32;
  destinations: Bytes32[];
}

export function encodeGuarantee(guarantee: Guarantee): Bytes32 {
  return defaultAbiCoder.encode(
    ['tuple(bytes32 guaranteedChannelId, bytes32[] destinations)'],
    [[guarantee.guaranteedChannelAddress, guarantee.destinations]],
  );
}
export function isGuarantee(
  allocationOrGuarantee: Allocation | Guarantee,
): allocationOrGuarantee is Guarantee {
  return !isAllocation(allocationOrGuarantee);
}

// Allocation and functions
export type Allocation = AllocationItem[];
export interface AllocationItem {
  destination: Bytes32;
  amount: Uint256;
}

export function encodeAllocation(allocation: Allocation): Bytes32 {
  return defaultAbiCoder.encode(['tuple(bytes32 destination, uint256 amount)[]'], [allocation]);
}
export function isAllocation(
  allocationOrGuarantee: Allocation | Guarantee,
): allocationOrGuarantee is Allocation {
  return Array.isArray(allocationOrGuarantee);
}

// Guarantee Outcome and functions
export interface GuaranteeOutcome {
  assetHolderAddress: Address;
  guarantee: Guarantee;
}
export function isGuaranteeOutcome(assetOutcome: AssetOutcome): assetOutcome is GuaranteeOutcome {
  return 'guarantee' in assetOutcome;
}

// Allocation outcome and functions
export interface AllocationOutcome {
  assetHolderAddress: Address;
  allocation: AllocationItem[];
}
export function isAllocationOutcome(assetOutcome: AssetOutcome): assetOutcome is AllocationOutcome {
  return 'allocation' in assetOutcome;
}

// Labelled outcome functions
export function encodeLabelledOutcome(outcomeType: OutcomeType, encodedData: Bytes32): Bytes32 {
  return defaultAbiCoder.encode(
    ['tuple(uint8 outcomeType, bytes allocationOrGuarantee)'],
    [{outcomeType, allocationOrGuarantee: encodedData}],
  );
}
// Outcome content functions
export function hashOutcomeContent(allocationOrGuarantee: Allocation | Guarantee): Bytes32 {
  return keccak256(encodeOutcomeContent(allocationOrGuarantee));
}
export function encodeOutcomeContent(allocationOrGuarantee: Allocation | Guarantee): Bytes32 {
  let encodedData;
  let outcomeType;
  if (isAllocation(allocationOrGuarantee)) {
    encodedData = encodeAllocation(allocationOrGuarantee);
    outcomeType = OutcomeType.AllocationOutcomeType;
  } else {
    encodedData = encodeGuarantee(allocationOrGuarantee);
    outcomeType = OutcomeType.GuaranteeOutcomeType;
  }
  return encodeLabelledOutcome(outcomeType, encodedData);
}

// Outcome and functions
export type AssetOutcome = AllocationOutcome | GuaranteeOutcome;
export type Outcome = AssetOutcome[];

export function hashOutcome(outcome: Outcome): Bytes32 {
  const encodedOutcome = encodeOutcome(outcome);
  return keccak256(defaultAbiCoder.encode(['bytes'], [encodedOutcome]));
}

export function encodeOutcome(outcome: Outcome): Bytes32 {
  const encodedAssetOutcomes = outcome.map(o => {
    let encodedData;
    let outcomeType;
    if (isAllocationOutcome(o)) {
      encodedData = encodeAllocation(o.allocation);
      outcomeType = OutcomeType.AllocationOutcomeType;
    } else {
      encodedData = encodeGuarantee(o.guarantee);
      outcomeType = OutcomeType.GuaranteeOutcomeType;
    }

    return {
      assetHolderAddress: o.assetHolderAddress,
      outcomeContent: encodeLabelledOutcome(outcomeType, encodedData),
    };
  });

  return defaultAbiCoder.encode(
    ['tuple(address assetHolderAddress, bytes outcomeContent)[]'],
    [encodedAssetOutcomes],
  );
}
