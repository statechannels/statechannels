/* eslint-disable jest/no-disabled-tests */
import {
  wireStateFormat,
  internalStateFormat,
  internalMessageFormat,
  wireMessageFormat
} from './example';
import {serializeState, serializeMessage} from './serialize';
import {deserializeState, deserializeMessage} from './deserialize';
import {validateState} from '@statechannels/wire-format';

// TODO: Get this working
// It looks like the signature data captured is no longer correct?
// I'd verify this but we didn't store the private key :(
it.skip('works for states', () => {
  expect(serializeState(internalStateFormat)).toEqual(wireStateFormat);
  expect(deserializeState(wireStateFormat)).toEqual(internalStateFormat);
});

it.skip('works for a message', () => {
  const {recipient, sender} = wireMessageFormat;
  expect(serializeMessage(internalMessageFormat, recipient, sender)).toEqual(wireMessageFormat);
  expect(deserializeMessage(wireMessageFormat)).toEqual(internalMessageFormat);
});

it('creates valid wire format', () => {
  const serializedState = serializeState(internalStateFormat);
  expect(() => validateState(serializedState)).not.toThrow();
});
