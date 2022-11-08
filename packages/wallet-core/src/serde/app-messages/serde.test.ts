import {serializeOutcome} from './serialize';
import {deserializeOutcome} from './deserialize';
import {
  externalEthAllocation,
  internalEthAllocation,
  internalMixedAllocation,
  externalMixedAllocation
} from './example';

it('works for a simple eth allocation', () => {
  expect(deserializeOutcome(externalEthAllocation)).toEqual(internalEthAllocation);
  expect(serializeOutcome(internalEthAllocation)).toEqual(externalEthAllocation);
});

it('works for a mixed allocation', () => {
  expect(deserializeOutcome(externalMixedAllocation)).toEqual(internalMixedAllocation);
  expect(serializeOutcome(internalMixedAllocation)).toEqual(externalMixedAllocation);
});
