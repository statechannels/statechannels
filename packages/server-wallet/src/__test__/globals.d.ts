export {};
declare global {
  namespace jest {
    interface Matchers</* eslint-disable-line */ R> {
      toContainAllocationItem<R>(received: { amount: string; destination: string }): R;
    }
  }
}
