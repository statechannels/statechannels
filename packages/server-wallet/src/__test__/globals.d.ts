import {ObjectiveDoneResult} from '../wallet';

export {};
declare global {
  namespace jest {
    interface Matchers</* eslint-disable-line */ R> {
      toContainAllocationItem<R>(received: {amount: string; destination: string}): R;
      toContainObject<R>(argument: R): R;
      toBeObjectiveDoneType<R>(expectedType: ObjectiveDoneResult['type']): R;
    }
  }
}
