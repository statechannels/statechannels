import { EventObject, SendAction, StateMachine, forwardTo } from 'xstate';
import { Outcome, State } from '@statechannels/nitro-protocol';
import { hashOutcome } from '@statechannels/nitro-protocol/lib/src/contract/outcome';
import { bigNumberify } from 'ethers/utils';
import { hashState } from '@statechannels/nitro-protocol/lib/src/contract/state';

import { ChannelUpdated, IStore } from './store';

export { Store, IStore } from './store';

export { Channel, getChannelId } from '@statechannels/nitro-protocol';

// This stuff should be replaced with some big number logic
type numberish = string | number | undefined;
type MathOp = (a: numberish, b: numberish) => string;
export const add: MathOp = (a: numberish, b: numberish) =>
  bigNumberify(a || 0)
    .add(b || 0)
    .toHexString();
export const subtract: MathOp = (a: numberish, b: numberish) => {
  const numA = bigNumberify(a || 0);
  const numB = bigNumberify(b || 0);

  if (numB.gt(numA)) {
    throw new Error('Unsafe subtraction');
  }
  return numA.sub(numB).toHexString();
};

export const max: MathOp = (a: numberish, b: numberish) =>
  Math.max(Number(a), Number(b)).toString();
export const gt = (a: numberish, b: numberish) => Number(a) > Number(b);
export const eq = (a: numberish, b: numberish) => Number(a) === Number(b);

export const success: { type: 'final' } = { type: 'final' };
export const failure: { type: 'final' } = { type: 'final' };

export type Without<T, K> = {
  [L in Exclude<keyof T, K>]: T[L];
};

export const pretty = o => JSON.stringify(o, null, 2);

type Transition<C> = { actions: SendAction<C, ChannelUpdated> };
export function forwardChannelUpdated<C>(id: string): Transition<C> {
  return { actions: forwardTo(id) };
}

// TODO
// Some machine factories require a context, and some don't
// Sort this out.
export type MachineFactory<I, E extends EventObject> = (
  store: IStore,
  context?: I
) => StateMachine<I, any, E>;

export function unreachable(x: never) {
  return x;
}

export function ensureExists<T>(t: T | undefined): T {
  if (!t) {
    throw new Error('Is undefined');
  }

  return t;
}

export function isDefined<T>(t: T | undefined): t is T {
  return !!t;
}

export const FINAL = 'final' as 'final';

export function outcomesEqual(left: Outcome, right: Outcome): boolean {
  return hashOutcome(left) === hashOutcome(right);
}
export function statesEqual(left: State, right: State): boolean {
  return hashState(left) === hashState(right);
}

const throwError = (fn: (t1: any) => boolean, t) => {
  throw new Error(`not valid, ${fn.name} failed on ${t}`);
};
type TypeGuard<T, S> = (t1: T | S) => t1 is T;
export function checkThat<T, S>(t: T | S, isTypeT: TypeGuard<T, S>): T {
  if (!isTypeT(t)) {
    throwError(isTypeT, t);
    // Typescrypt doesn't know that throwError throws an error.
    throw 'Unreachable';
  }
  return t;
}
