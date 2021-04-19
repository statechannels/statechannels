import {AllocationItem, areAllocationItemsEqual} from '@statechannels/wallet-core';

import {ObjectiveDoneResult, ObjectiveResult} from '../src/wallet';

expect.extend({
  toContainAllocationItem(received: AllocationItem[], argument: AllocationItem) {
    const pass = received.some(areAllocationItemsEqual.bind(null, argument));
    if (pass) {
      return {
        pass: true,
        message: () =>
          `expected ${JSON.stringify(received, null, 2)} to not contain ${JSON.stringify(
            argument,
            null,
            2
          )}`,
      };
    } else {
      return {
        pass: false,
        message: () =>
          `expected ${JSON.stringify(received, null, 2)} to contain ${JSON.stringify(
            argument,
            null,
            2
          )}`,
      };
    }
  },
});

// https://medium.com/@andrei.pfeiffer/jest-matching-objects-in-array-50fe2f4d6b98
expect.extend({
  toContainObject(received, argument) {
    const pass = this.equals(received, expect.arrayContaining([expect.objectContaining(argument)]));

    if (pass) {
      return {
        message: () =>
          `expected ${this.utils.printReceived(
            received
          )} not to contain object ${this.utils.printExpected(argument)}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${this.utils.printReceived(
            received
          )} to contain object ${this.utils.printExpected(argument)}`,
        pass: false,
      };
    }
  },
});

expect.extend({
  toBeObjectiveDoneType: async (
    received: ObjectiveResult[],
    expected: ObjectiveDoneResult['type']
  ) => {
    const results = await Promise.all(received.map(async r => ({...r, resolved: await r.done})));

    const pass = received.length > 0 && results.every(r => r.resolved.type === expected);
    if (pass) {
      const matchingObjectives = printObjectives(results.filter(r => r.resolved.type === expected));
      return {
        pass,
        message: () =>
          `expected every objective to not be ${expected}. Failing objectives: ${matchingObjectives}`,
      };
    } else {
      if (received.length === 0) {
        return {message: () => 'expected at least one ObjectiveResult', pass};
      } else {
        const notMatchingObjectives = printObjectives(
          results.filter(r => r.resolved.type !== expected)
        );

        return {
          pass,
          message: () =>
            `expected every objective to be ${expected}. Failing objectives: ${notMatchingObjectives}`,
        };
      }
    }
  },
});

function printObjectives(
  objectiveResults: Array<ObjectiveResult & {resolved: ObjectiveDoneResult}>
): string {
  return JSON.stringify(
    objectiveResults.map(r => ({
      type: r.resolved.type,
      objectiveId: r.objectiveId,
    })),
    null,
    1
  );
}
