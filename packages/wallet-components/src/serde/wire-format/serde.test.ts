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
