import {StateNodeConfig, DoneInvokeEvent} from 'xstate';
import {hexZeroPad} from 'ethers/utils';

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

type Opts = {onDone?: string; id?: string; onError?: string};
export function getDataAndInvoke<T, Services extends string = string>(
  data: {src: Services; opts?: Opts},
  service: {src: Services; opts?: Opts},
  onDone?: string
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
          onDone: 'done'
        }
      },
      done: {type: 'final'}
    },
    onDone
  };
}

export function createDestination(address: string): string {
  return hexZeroPad(address, 32);
}
