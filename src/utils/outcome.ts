import {
  AllocationItem,
  SimpleEthAllocation,
  Outcome,
  SimpleTokenAllocation,
  SimpleTokenGuarantee,
  MixedAllocation,
  SimpleEthGuarantee
} from '../store/types';

const outcomeGuard = <T extends Outcome>(type: Outcome['type']) => (o: Outcome): o is T =>
  o.type === type;
export const isSimpleEthAllocation = outcomeGuard<SimpleEthAllocation>('SimpleEthAllocation');
export const isSimpleEthGuarantee = outcomeGuard<SimpleEthGuarantee>('SimpleEthGuarantee');
export const isSimpleTokenAllocation = outcomeGuard<SimpleTokenAllocation>('SimpleTokenAllocation');
export const isSimpleTokenGuarantee = outcomeGuard<SimpleTokenGuarantee>('SimpleTokenGuarantee');
export const isMixedAllocation = outcomeGuard<MixedAllocation>('MixedAllocation');

export const simpleEthAllocation = (...allocationItems: AllocationItem[]): SimpleEthAllocation => ({
  type: 'SimpleEthAllocation',
  allocationItems
});

export const simpleTokenAllocation = (
  tokenAddress: string,
  ...allocationItems: AllocationItem[]
): SimpleTokenAllocation => ({
  type: 'SimpleTokenAllocation',
  allocationItems,
  tokenAddress
});

export const simpleEthGuarantee = (
  guarantorAddress: string,
  ...destinations: string[]
): SimpleEthGuarantee => ({
  type: 'SimpleEthGuarantee',
  destinations,
  guarantorAddress
});

export const simpleTokenGuarantee = (
  tokenAddress: string,
  guarantorAddress: string,
  ...destinations: string[]
): SimpleTokenGuarantee => ({
  type: 'SimpleTokenGuarantee',
  destinations,
  guarantorAddress,
  tokenAddress
});
