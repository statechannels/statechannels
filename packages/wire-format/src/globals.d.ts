export {};
declare global {
  namespace jest {
    interface Matchers</* eslint-disable-line */ R> {
      toThrowValidationError<R>(message: string, jsonBlob: any, validationError: string): R;
    }
  }
}
