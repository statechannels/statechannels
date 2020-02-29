import {wireStateFormat, internalFormat} from './example';
import {serializeState} from './serialize';
import {deserializeState} from './deserialize';
import {validateState} from '@statechannels/wire-format';

it('works', () => {
  expect(serializeState(internalFormat)).toEqual(wireStateFormat);
  expect(deserializeState(wireStateFormat)).toEqual(internalFormat);
});

it('creates valid wire format', () => {
  expect(() => validateState(serializeState(internalFormat))).not.toThrow();
});
