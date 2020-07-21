import {messageIsValid, validateMessage} from '../validator';

import * as good from './good_sample_messages';
import * as bad from './bad_sample_messages';

describe('validateRequest', () => {
  it('works', () => {
    expect(messageIsValid(bad.dataMissing)).toBe(false);
    expect(messageIsValid(bad.extraProperty)).toBe(false);
    expect(messageIsValid(bad.emptyState)).toBe(false);
    expect(messageIsValid(good.goodMessage)).toBe(true);
  });
});

describe('validate message', () => {
  it('validates good messages', () => {
    expect(validateMessage(good.goodMessage)).toEqual(good.goodMessage);
  });

  it('returns helpful error messages', () => {
    expect(() => validateMessage(bad.dataMissing)).toThrow(
      `Validation Error: Missing required property 'data' at root`
    );
    expect(() => validateMessage(bad.extraProperty)).toThrow(
      `Validation Error: Unexpected property 'iShouldntBeHere' found at root`
    );
    expect(() => validateMessage(bad.emptyState)).toThrow(
      `Validation Error: Missing required property 'appData' at root.data.signedStates[0]`
    );
  });
});
