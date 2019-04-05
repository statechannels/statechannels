import { SideEffects } from './outbox/state';

// Constructs a type that must include all properties of T apart from 'type', 'stage', and 'player'
export type Properties<T> = Pick<T, Exclude<keyof T, 'type' | 'stage' | 'player'>> & {
  [x: string]: any;
};

export interface StateWithSideEffects<T> {
  state: T;
  sideEffects?: SideEffects;
}

export interface TransactionExists {
  transactionHash: string;
}
