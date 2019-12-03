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
  return JSON.stringify(channel);
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
export { store, Store } from './store';

// This stuff should be replaced with some big number logic
type numberish = string | number;
export const add = (a: numberish, b: numberish) =>
  (Number(a) + Number(b)).toString();
export const subtract = (a: numberish, b: numberish) =>
  (Number(a) - Number(b)).toString();
export const max = (a: numberish, b: numberish) =>
  Math.max(Number(a), Number(b)).toString();
export const gt = (a: numberish, b: numberish) => Number(a) > Number(b);
