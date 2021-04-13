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
    const pass = received.length > 0 && received.every(async o => (await o.done).type === expected);
    if (pass) {
      const matchingObjectives = received.filter(async o => (await o.done).type === expected);
      return {
        pass,
        message: () =>
          `expected every objective to not be ${expected}. Failing objectives: ${printObjectives(
            matchingObjectives
          )}`,
      };
    } else {
      if (received.length === 0) {
        return {message: () => 'expected at least one ObjectiveResult', pass};
      } else {
        const notMatchingObjectives = received.filter(async o => (await o.done).type === expected);
        return {
          pass,
          message: () =>
            `expected every objective to be ${expected}. Failing objectives: ${printObjectives(
              notMatchingObjectives
            )}`,
        };
      }
    }
  },
});

async function printObjectives(results: ObjectiveResult[]): Promise<string> {
  return JSON.stringify(
    results.map(async r => ({type: (await r.done).type, objectiveId: r.objectiveId})),
    null,
    1
  );
}
