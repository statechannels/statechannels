/* eslint-disable jest/no-try-expect */
import _ from 'lodash';

import {messageIsValid, validateMessage, validateState} from '../validator';

import * as good from './good_sample_messages';
import * as bad from './bad_sample_messages';

describe('validateRequest', () => {
  it('works', () => {
    expect(messageIsValid(bad.dataMissing)).toBe(false);
    expect(messageIsValid(bad.extraProperty)).toBe(false);
    expect(messageIsValid(bad.emptyState)).toBe(false);
    expect(messageIsValid(good.goodMessage)).toBe(true);
    expect(messageIsValid(good.undefinedObjectives1)).toBe(true);
    expect(messageIsValid(good.undefinedObjectives2)).toBe(true);
  });
});

describe('validate message', () => {
  it('validates good messages', () => {
    expect(validateMessage(good.goodMessage)).toEqual(good.goodMessage);
  });

  expect.extend({
    toThrowValidationError(
      errThrower: () => Error,
      message: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jsonBlob: any,
      validationError: string
    ): jest.CustomMatcherResult {
      try {
        errThrower();
      } catch (err) {
        if (err.constructor.name !== 'WireFormatValidationError')
          return {
            pass: false,
            message: () =>
              `expected function to throw WireFormatValidationError, threw ${err.constructor.name}`
          };

        if (err.message !== message) {
          return {
            pass: false,
            message: () => `expected message ${message}, received ${err.message}`
          };
        }
        if (!_.isEqual(err.jsonBlob, jsonBlob)) {
          return {
            pass: false,
            message: () => `incorrect json blob`
          };
        }

        if (!err.errorMessages.includes(validationError)) {
          return {
            pass: false,
            message: () =>
              `expected validation error ${validationError}, received array ${JSON.stringify(
                err.errorMessages
              )}`
          };
        }

        return {pass: true, message: () => 'passed'};
      }

      return {pass: false, message: () => 'expected to throw error'};
    }
  });

  it('returns helpful errors', () => {
    // Otherwise jest complains about zero expectations
    expect(0).toEqual(0);

    expect(() => validateMessage(bad.dataMissing)).toThrowValidationError(
      'Invalid message',
      bad.dataMissing,
      "Missing required property 'data' at root"
    );
    expect(() => validateMessage(bad.extraProperty)).toThrowValidationError(
      'Invalid message',
      bad.extraProperty,
      "Unexpected property 'iShouldntBeHere' found at root "
    );

    expect(() => validateMessage(bad.emptyState)).toThrowValidationError(
      'Invalid message',
      bad.emptyState,
      "Missing required property 'appData' at root.data.signedStates[0]"
    );

    expect(() => validateMessage(bad.emptyStringObjectives)).toThrowValidationError(
      'Invalid message',
      bad.emptyStringObjectives,
      'Property at root.data.objectives should be array'
    );

    expect(() => validateMessage(bad.nullObjectives)).toThrowValidationError(
      'Invalid message',
      bad.nullObjectives,
      'Property at root.data.objectives should be array'
    );

    expect(() => validateState({turnNum: 3})).toThrowValidationError(
      'Invalid state',
      {turnNum: 3},
      "Missing required property 'appData' at root"
    );
  });
});
