import { serializeAllocation } from './serialize';
import { deserializeAllocations } from './deserialize';
import {
  externalEthAllocation,
  internalEthAllocation,
  internalMixedAllocation,
  externalMixedAllocation,
} from './example';

it('works for a simple eth allocation', () => {
  expect(deserializeAllocations(externalEthAllocation)).toEqual(internalEthAllocation);
  expect(serializeAllocation(internalEthAllocation)).toEqual(externalEthAllocation);
});

it('works for a mixed allocation', () => {
  expect(deserializeAllocations(externalMixedAllocation)).toEqual(internalMixedAllocation);
  expect(serializeAllocation(internalMixedAllocation)).toEqual(externalMixedAllocation);
});
