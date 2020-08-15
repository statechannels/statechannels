// import {utils} from 'ethers';

import {hash} from '../hashing';

import {Address, Bytes, Bytes32, Uint256} from './types';
import {encode, decode} from './abi';

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
  return encode(
    ['tuple(bytes32 targetChannelId, bytes32[] destinations)'],
    [[guarantee.targetChannelId, guarantee.destinations]]
  );
}

export function decodeGuarantee(encodedGuarantee: Bytes): Guarantee {
  const {targetChannelId, destinations} = decode(
    ['tuple(bytes32 targetChannelId, bytes32[] destinations)'],
    encodedGuarantee
  )[0];

  return {targetChannelId, destinations};
}

export function isGuarantee(
  allocationOrGuarantee: Allocation | Guarantee
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
  return encode(['tuple(bytes32 destination, uint256 amount)[]'], [allocation]);
}

export function decodeAllocation(encodedAllocation: Bytes): Allocation {
  const allocationItems = decode(
    ['tuple(bytes32 destination, uint256 amount)[]'],
    encodedAllocation
  )[0];

  return allocationItems.map(a => ({destination: a.destination, amount: a.amount.toHexString()}));
}

export function isAllocation(
  allocationOrGuarantee: Allocation | Guarantee
): allocationOrGuarantee is Allocation {
  return Array.isArray(allocationOrGuarantee);
}

// Guarantee Outcome and functions
export interface GuaranteeAssetOutcome {
  assetHolderAddress: Address;
  guarantee: Guarantee;
}
export function isGuaranteeOutcome(
  assetOutcome: AssetOutcome
): assetOutcome is GuaranteeAssetOutcome {
  return 'guarantee' in assetOutcome;
}

// Allocation outcome and functions
export interface AllocationAssetOutcome {
  assetHolderAddress: Address;
  allocationItems: AllocationItem[];
}
export function isAllocationOutcome(
  assetOutcome: AssetOutcome
): assetOutcome is AllocationAssetOutcome {
  return 'allocationItems' in assetOutcome;
}

// Asset outcome functions
export function encodeAssetOutcomeFromBytes(
  assetOutcomeType: AssetOutcomeType,
  encodedAllocationOrGuarantee: Bytes
): Bytes32 {
  return encode(
    ['tuple(uint8 assetOutcomeType, bytes allocationOrGuarantee)'],
    [{assetOutcomeType, allocationOrGuarantee: encodedAllocationOrGuarantee}]
  );
}

export function decodeOutcomeItem(
  encodedAssetOutcome: Bytes,
  assetHolderAddress: string
): AssetOutcome {
  const {outcomeType, allocationOrGuarantee} = decode(
    ['tuple(uint8 outcomeType, bytes allocationOrGuarantee)'],
    encodedAssetOutcome
  )[0];
  switch (outcomeType) {
    case AssetOutcomeType.AllocationOutcomeType:
      return {assetHolderAddress, allocationItems: decodeAllocation(allocationOrGuarantee)};
    case AssetOutcomeType.GuaranteeOutcomeType:
      return {assetHolderAddress, guarantee: decodeGuarantee(allocationOrGuarantee)};
    default:
      throw new Error(`Received invalid outcome type ${outcomeType}`);
  }
}

// Asset outcome functions
export function hashAssetOutcome(allocationOrGuarantee: Allocation | Guarantee): Bytes32 {
  return hash(encodeAssetOutcome(allocationOrGuarantee));
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
// As the Outcome struct defined in Outcome.sol

export function hashOutcome(outcome: Outcome): Bytes32 {
  const encodedOutcome = encodeOutcome(outcome);
  return hash(encode(['bytes'], [encodedOutcome]));
}

export function decodeOutcome(encodedOutcome: Bytes): Outcome {
  const assetOutcomes = decode(
    ['tuple(address assetHolderAddress, bytes outcomeContent)[]'],
    encodedOutcome
  )[0];
  return assetOutcomes.map(a => decodeOutcomeItem(a.outcomeContent, a.assetHolderAddress));
}

export function encodeOutcome(outcome: Outcome): Bytes32 {
  const encodedAssetOutcomes = outcome.map((o: AssetOutcome) => {
    let encodedData;
    let outcomeType;
    if (isAllocationOutcome(o)) {
      encodedData = encodeAllocation(o.allocationItems);
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

  return encode(
    ['tuple(address assetHolderAddress, bytes outcomeContent)[]'],
    [encodedAssetOutcomes]
  );
}
