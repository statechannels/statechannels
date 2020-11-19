export {};
declare global {
  namespace jest {
    interface Matchers</* eslint-disable-line */ R> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toThrowValidationError<R>(message: string, jsonBlob: any, validationError: string): R;
    }
  }
}
