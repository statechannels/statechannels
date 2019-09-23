import {defaultAbiCoder, keccak256} from 'ethers/utils';
import {Bytes32, Address, Uint256, Bytes} from './types';

export enum AssetOutcomeType {
  AllocationOutcomeType = 0,
  GuaranteeOutcomeType = 1,
}

// Guarantee and functions
export interface Guarantee {
  targetChannelId: Bytes32;
  destinations: Bytes32[];
}

export function encodeGuarantee(guarantee: Guarantee): Bytes32 {
  return defaultAbiCoder.encode(
    ['tuple(bytes32 targetChannelId, bytes32[] destinations)'],
    [[guarantee.targetChannelId, guarantee.destinations]],
  );
}

export function decodeGuarantee(encodedGuarantee: Bytes): Guarantee {
  const {targetChannelId, destinations} = defaultAbiCoder.decode(
    ['tuple(bytes32 targetChannelId, bytes32[] destinations)'],
    encodedGuarantee,
  )[0];

  return {targetChannelId, destinations};
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

export function decodeAllocation(encodedAllocation: Bytes): Allocation {
  const allocationItems = defaultAbiCoder.decode(
    ['tuple(bytes32 destination, uint256 amount)[]'],
    encodedAllocation,
  )[0];

  return allocationItems.map(a => {
    return {destination: a.destination, amount: a.amount.toHexString()};
  });
}

export function isAllocation(
  allocationOrGuarantee: Allocation | Guarantee,
): allocationOrGuarantee is Allocation {
  return Array.isArray(allocationOrGuarantee);
}

// Guarantee Outcome and functions
export interface GuaranteeAssetOutcome {
  assetHolderAddress: Address;
  guarantee: Guarantee;
}
export function isGuaranteeOutcome(
  assetOutcome: AssetOutcome,
): assetOutcome is GuaranteeAssetOutcome {
  return 'guarantee' in assetOutcome;
}

// Allocation outcome and functions
export interface AllocationAssetOutcome {
  assetHolderAddress: Address;
  allocation: AllocationItem[];
}
export function isAllocationOutcome(
  assetOutcome: AssetOutcome,
): assetOutcome is AllocationAssetOutcome {
  return 'allocation' in assetOutcome;
}

// Asset outcome functions
export function encodeAssetOutcomeFromBytes(
  assetOutcomeType: AssetOutcomeType,
  encodedAllocationOrGuarantee: Bytes,
): Bytes32 {
  return defaultAbiCoder.encode(
    ['tuple(uint8 assetOutcomeType, bytes allocationOrGuarantee)'],
    [{assetOutcomeType, allocationOrGuarantee: encodedAllocationOrGuarantee}],
  );
}

export function decodeOutcomeItem(
  encodedAssetOutcome: Bytes,
  assetHolderAddress: string,
): AssetOutcome {
  const {outcomeType, allocationOrGuarantee} = defaultAbiCoder.decode(
    ['tuple(uint8 outcomeType, bytes allocationOrGuarantee)'],
    encodedAssetOutcome,
  )[0];
  switch (outcomeType) {
    case AssetOutcomeType.AllocationOutcomeType:
      return {assetHolderAddress, allocation: decodeAllocation(allocationOrGuarantee)};
    case AssetOutcomeType.GuaranteeOutcomeType:
      return {assetHolderAddress, guarantee: decodeGuarantee(allocationOrGuarantee)};
    default:
      throw new Error(`Received invalid outcome type ${outcomeType}`);
  }
}

// Asset outcome functions
export function hashAssetOutcome(allocationOrGuarantee: Allocation | Guarantee): Bytes32 {
  return keccak256(encodeAssetOutcome(allocationOrGuarantee));
}
export function encodeAssetOutcome(allocationOrGuarantee: Allocation | Guarantee): Bytes32 {
  let encodedData;
  let outcomeType;
  if (isAllocation(allocationOrGuarantee)) {
    encodedData = encodeAllocation(allocationOrGuarantee);
    outcomeType = AssetOutcomeType.AllocationOutcomeType;
  } else {
    encodedData = encodeGuarantee(allocationOrGuarantee);
    outcomeType = AssetOutcomeType.GuaranteeOutcomeType;
  }
  return encodeAssetOutcomeFromBytes(outcomeType, encodedData);
}

// Outcome and functions
export type AssetOutcome = AllocationAssetOutcome | GuaranteeAssetOutcome;
export type Outcome = AssetOutcome[];
// ^ Note this is not the same structure
// as the Outcome struct defined in Outcome.sol

export function hashOutcome(outcome: Outcome): Bytes32 {
  const encodedOutcome = encodeOutcome(outcome);
  return keccak256(defaultAbiCoder.encode(['bytes'], [encodedOutcome]));
}

export function decodeOutcome(encodedOutcome: Bytes): Outcome {
  const assetOutcomes = defaultAbiCoder.decode(
    ['tuple(address assetHolderAddress, bytes outcomeContent)[]'],
    encodedOutcome,
  )[0];
  return assetOutcomes.map(a => decodeOutcomeItem(a.outcomeContent, a.assetHolderAddress));
}

export function encodeOutcome(outcome: Outcome): Bytes32 {
  const encodedAssetOutcomes = outcome.map((o: AssetOutcome) => {
    let encodedData;
    let outcomeType;
    if (isAllocationOutcome(o)) {
      encodedData = encodeAllocation(o.allocation);
      outcomeType = AssetOutcomeType.AllocationOutcomeType;
    } else {
      encodedData = encodeGuarantee(o.guarantee);
      outcomeType = AssetOutcomeType.GuaranteeOutcomeType;
    }

    return {
      assetHolderAddress: o.assetHolderAddress,
      outcomeContent: encodeAssetOutcomeFromBytes(outcomeType, encodedData),
    };
  });

  return defaultAbiCoder.encode(
    ['tuple(address assetHolderAddress, bytes outcomeContent)[]'],
    [encodedAssetOutcomes],
  );
}
