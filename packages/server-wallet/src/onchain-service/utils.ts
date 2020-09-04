import {Evt} from 'evt/lib/types';
import pino from 'pino';

import {Values} from '../errors/wallet-error';

export abstract class BaseError extends Error {
  static readonly errors = {
    OnchainError: 'OnchainError',
    TransactionError: 'TransactionError',
    StorageError: 'StorageError',
  } as const;

  readonly context: any;

  static readonly knownErrors: {[key: string]: string};

  static isKnownErr(errorMessage: string, knownErrors: string[]): boolean {
    const idx = knownErrors.findIndex(known => errorMessage.includes(known));
    return idx !== -1;
  }

  abstract readonly type: Values<typeof BaseError.errors>;
  static readonly reasons: {[key: string]: string};
  constructor(reason: Values<typeof BaseError.reasons>, public readonly data: any = undefined) {
    super(reason);
    this.context = data;
  }
}

// Adds a handler to an evt instance and returns the result
// based on the input arguments
export const addEvtHandler = (
  evt: Evt<any>,
  callback: (event: any) => void | Promise<void>,
  filter?: (event: any) => boolean,
  timeout?: number
): Evt<any> | Promise<any> => {
  if (filter && timeout) {
    return evt.attach(filter, timeout, callback);
  } else if (filter) {
    return evt.attach(filter, callback);
  }
  return evt.attach(callback);
};

export const logger = pino();
