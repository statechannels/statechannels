/* eslint-disable jest/no-disabled-tests */
import {validateState} from '@statechannels/wire-format';

import {
  wireStateFormat,
  internalStateFormat,
  internalMessageFormat,
  wireMessageFormat,
  walletVersion
} from './example';
import {serializeState, serializeMessage} from './serialize';
import {deserializeState, deserializeMessage} from './deserialize';

it('works for states', () => {
  expect(serializeState(internalStateFormat)).toEqual(wireStateFormat);
  expect(deserializeState(wireStateFormat)).toEqual(internalStateFormat);
});

it('works for a message', () => {
  const {recipient, sender} = wireMessageFormat;
  expect(serializeMessage(walletVersion, internalMessageFormat, recipient, sender)).toEqual(
    wireMessageFormat
  );
  expect(deserializeMessage(wireMessageFormat)).toEqual(internalMessageFormat);
});

it('creates valid wire format', () => {
  const serializedState = serializeState(internalStateFormat);
  expect(() => validateState(serializedState)).not.toThrow();
});
