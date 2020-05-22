import {StateNodeConfig, DoneInvokeEvent, TransitionConfig} from 'xstate';
import {hexZeroPad, hexlify} from '@ethersproject/bytes';
import {BigNumber} from 'ethers';
export function unreachable(x: never) {
  return x;
}

export const exists = <T>(t: T | undefined): t is T => !!t;

const throwError = (fn: (t1: any) => boolean, t) => {
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

type Opts<T> = {
  onDone?: string | TransitionConfig<T, any>;
  id?: string;
  onError?: string | TransitionConfig<T, any>;
  entry?: string;
  exit?: string;
};
export function getDataAndInvoke<T, Services extends string = string>(
  data: {src: Services; opts?: Opts<T>},
  service: {src: Services; opts?: Opts<T>},
  onDone?: string | TransitionConfig<T, any> | TransitionConfig<T, any>[]
): StateNodeConfig<T, any, DoneInvokeEvent<T>> {
  return {
    initial: data.src,
    states: {
      [data.src]: {invoke: {src: data.src, onDone: service.src, onError: data.opts?.onError}},
      [service.src]: {
        invoke: {
          id: service?.opts?.id,
          src: service.src,
          data: (_, {data}: DoneInvokeEvent<T>) => data,
          onDone: 'done',
          onError: service.opts?.onError
        },
        entry: service.opts?.entry
      },
      done: {type: 'final'}
    },
    onDone
  };
}

export function createDestination(address: string): string {
  return hexZeroPad(address, 32);
}

export function formatAmount(amount: BigNumber): string {
  return hexZeroPad(hexlify(amount), 32);
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
    .map(k => record[k])
    .filter(e => e !== undefined) as Array<T>;
}
