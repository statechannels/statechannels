import {defaultAbiCoder, keccak256} from 'ethers/utils';
import {Bytes32, Address, Uint256} from './types';

const ALLOCATION_OUTCOME = 0;
const GUARANTEE_OUTCOME = 1;

// Guarantee Outcome and functions
export interface GuaranteeOutcome {
  assetHolderAddress: Address;
  guarantee: Guarantee;
}

export function isGuaranteeOutcome(assetOutcome: AssetOutcome): assetOutcome is GuaranteeOutcome {
  return 'guarantee' in assetOutcome;
}

// This returns an encoded AssetOutcome
export function encodeGuaranteeOutcome(guaranteeOutcome: GuaranteeOutcome): Bytes32 {
  const guarantee = encodeGuarantee(guaranteeOutcome.guarantee);
  return defaultAbiCoder.encode(
    ['tuple(uint8 outcomeType, bytes allocationOrGuarantee)'],
    [{outcomeType: GUARANTEE_OUTCOME, allocationOrGuarantee: guarantee}],
  );
}

// Allocation outcome and functions
export interface AllocationOutcome {
  assetHolderAddress: Address;
  allocation: AllocationItem[];
}

export function isAllocationOutcome(assetOutcome: AssetOutcome): assetOutcome is AllocationOutcome {
  return 'allocation' in assetOutcome;
}

export function encodeAllocationOutcome(allocationOutcome: AllocationOutcome): Bytes32 {
  const allocation = encodeAllocation(allocationOutcome.allocation);
  return defaultAbiCoder.encode(
    ['tuple(uint8 outcomeType, bytes allocationOrGuarantee)'],
    [{outcomeType: ALLOCATION_OUTCOME, allocationOrGuarantee: allocation}],
  );
}
export type AssetOutcome = AllocationOutcome | GuaranteeOutcome;

export type Outcome = AssetOutcome[];

export function hashOutcome(outcome: Outcome): Bytes32 {
  const encodedOutcome = encodeOutcome(outcome);

  return keccak256(defaultAbiCoder.encode(['bytes'], [encodedOutcome]));
}

export function hashOutcomeContent(assetOutcome: AssetOutcome): Bytes32 {
  return keccak256(encodeOutcomeContent(assetOutcome));
}
function encodeOutcomeContent(assetOutcome: AssetOutcome): Bytes32 {
  return isAllocationOutcome(assetOutcome)
    ? encodeAllocationOutcome(assetOutcome)
    : encodeGuaranteeOutcome(assetOutcome);
}
export function encodeOutcome(outcome: Outcome): Bytes32 {
  const encodedAssetOutcomes = outcome.map(o => ({
    assetHolderAddress: o.assetHolderAddress,
    outcomeContent: encodeOutcomeContent(o),
  }));

  return defaultAbiCoder.encode(
    ['tuple(address assetHolderAddress, bytes outcomeContent)[]'],
    [encodedAssetOutcomes],
  );
}

// Guarantee and functions
export interface Guarantee {
  guaranteedChannelAddress: Address;
  destinations: Bytes32[];
}

export function encodeGuarantee(guarantee: Guarantee): Bytes32 {
  return defaultAbiCoder.encode(
    ['tuple(uint8 guaranteedChannelId, bytes32[] destinations)'],
    [[guarantee.guaranteedChannelAddress, guarantee.destinations]],
  );
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
