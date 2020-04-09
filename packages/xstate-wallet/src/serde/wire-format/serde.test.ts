/* eslint-disable jest/no-disabled-tests */
import {
  wireStateFormat,
  internalStateFormat,
  internalMessageFormat,
  wireMessageFormat,
  externalSimpleGuarantee,
  internalSimpleGuarantee
} from './example';
import {serializeState, serializeMessage, serializeOutcome} from './serialize';
import {deserializeState, deserializeMessage, deserializeOutcome} from './deserialize';
import {validateState} from '@statechannels/wire-format';

it('works for states', () => {
  expect(serializeState(internalStateFormat)).toEqual(wireStateFormat);
  expect(deserializeState(wireStateFormat)).toEqual(internalStateFormat);
});

it('works for a message', () => {
  const {recipient, sender} = wireMessageFormat;
  expect(serializeMessage(internalMessageFormat, recipient, sender)).toEqual(wireMessageFormat);
  expect(deserializeMessage(wireMessageFormat)).toEqual(internalMessageFormat);
});

it('creates valid wire format', () => {
  const serializedState = serializeState(internalStateFormat);
  expect(() => validateState(serializedState)).not.toThrow();
});

it('deserializes a guarantee outcome', () => {
  expect(deserializeOutcome(externalSimpleGuarantee)).toEqual(internalSimpleGuarantee);
});
it('serializes a guarantee outcome', () => {
  expect(serializeOutcome(internalSimpleGuarantee)).toEqual(externalSimpleGuarantee);
});
