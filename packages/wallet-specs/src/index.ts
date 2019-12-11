import { isUndefined } from 'util';
import { EventObject, SendAction, StateMachine } from 'xstate';
import { forwardTo } from 'xstate/lib/actions';
import { ChannelUpdated, IStore, Store } from './store';
const store = new Store();
export { Store, store };

export type AppData = string;
export type Signature = string;
export type Recipient = any;
export interface AllocationItem {
  destination: string;
  amount: string;
}
export type Allocation = AllocationItem[];
export interface Balance {
  address: string;
  wei: string;
}
export interface Guarantee {
  target: string;
  guarantee: string[];
}
export type Outcome = Allocation | Guarantee;
export type Address = string;
export type PrivateKey = string;

interface VariablePart {
  turnNum: number;
  outcome: Outcome;
  isFinal: boolean;
}

export type State = VariablePart & {
  appData?: AppData;
  appDefinition?: string;
  channel: Channel;
  challengeDuration: string;
};

export function nextState(state: State, opts?: Partial<VariablePart>): State {
  return {
    ...state,
    turnNum: state.turnNum + 1,
    ...opts,
  };
}

export interface Channel {
  channelNonce: string;
  participants: Address[];
  chainId: string;
}

export function getChannelID(channel: Channel) {
  return channel.participants.concat(channel.channelNonce).join('+');
}

export interface SignedState {
  state: State;
  signatures: Signature[];
}

export interface Failure {
  value: 'failure';
  context: {
    reason: string;
  };
}

export interface Entry {
  type: '';
}

export { chain } from './chain';

// This stuff should be replaced with some big number logic
type numberish = string | number;
export const add = (a: numberish, b: numberish) =>
  (Number(a) + Number(b)).toString();
export const subtract = (a: numberish, b: numberish) =>
  (Number(a) - Number(b)).toString();
export const max = (a: numberish, b: numberish) =>
  Math.max(Number(a), Number(b)).toString();
export const gt = (a: numberish, b: numberish) => Number(a) > Number(b);

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
