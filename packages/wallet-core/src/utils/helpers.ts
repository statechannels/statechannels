import { utils } from 'ethers';

import { BN } from '../bignumber';
import { Uint256 } from '../types';
export function unreachable(x: never) {
  return x;
}

export const exists = <T>(t: T | undefined): t is T => !!t;

const throwError = (fn: (t1: any) => boolean, t: any) => {
  throw new Error(`not valid, ${fn.name} failed on ${t}`);
};
type TypeGuard<T, S> = (t1: T | S) => t1 is T;
export function checkThat<T, S = undefined>(t: T | S, isTypeT: TypeGuard<T, S>): T {
  if (!isTypeT(t)) {
    throwError(isTypeT, t);
    // Typescrypt doesn't know that throwError throws an error.
    throw 'Unreachable';
  }
  return t;
}

export function createDestination(address: string): string {
  return utils.hexZeroPad(address, 32);
}

export function formatAmount(amount: Uint256): Uint256 {
  return utils.hexZeroPad(BN.from(amount), 32) as Uint256;
}

export function arrayToRecord<T, K extends keyof T>(
  array: Array<T>,
  idProperty: K
): Record<string | number, T> {
  return array.reduce((obj, item) => {
    obj[item[idProperty]] = item;
    return obj;
  }, {} as any);
}

export function recordToArray<T>(record: Record<string | number, T | undefined>): Array<T> {
  return Object.keys(record)
    .map((k) => record[k])
    .filter((e) => e !== undefined) as Array<T>;
}
