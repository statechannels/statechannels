import {AllocationItem} from '@statechannels/wallet-core';

export {};
declare global {
  namespace jest {
    interface Matchers</* eslint-disable-line */ R> {
      toContainAllocationItem<R>(received: AllocationItem): R;
    }
  }
}
