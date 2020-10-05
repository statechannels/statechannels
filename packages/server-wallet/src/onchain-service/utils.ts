import {Evt} from 'evt/lib/types';
import pino from 'pino';

import {Values} from '../errors/wallet-error';

import {FundingEvent} from './types';

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
  // NOTE: If this type is not an array with a length, then using
  // the spread operator will cause errors on the evt package
  const attachArgs = [filter, timeout, callback].filter(x => !!x) as [any, any, any];
  return evt.attach(...attachArgs);
};

export const logger = pino();

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isFundingEvent(e: any): e is FundingEvent {
  if (!e?.transactionHash) return false;
  if (!e?.blockNumber) return false;
  if (!e?.channelId) return false;
  if (!e?.amount) return false;
  if (!e?.type) return false;
  if (typeof e?.final !== 'boolean') return false;
  return true;
}
