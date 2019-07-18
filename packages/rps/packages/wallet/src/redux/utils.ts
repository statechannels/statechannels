import { SideEffects } from './outbox/state';

// Constructs a type that must include all properties of T apart from 'type', 'stage', and 'player'
export type Properties<T> = Pick<T, Exclude<keyof T, 'type' | 'stage' | 'player'>>;

// Constructs the type of our state constructors
//
// Example:
//
//    const waitForSend: Constructor<WaitForSend> = p => {
//       const { processId } = p;
//       return { type: 'WaitForSend', processId };
//    }
export type StateConstructor<T> = (p: Properties<T>) => T;

// Constructs the type of our action constructors
// Note: extraneous keys not accepted
export type ActionConstructor<T> = (p: Pick<T, Exclude<keyof T, 'type' | 'protocol'>>) => T;

export type ActionDispatcher<T> = (p: Pick<T, Exclude<keyof T, 'type' | 'protocol'>>) => void;

export interface StateWithSideEffects<T> {
  state: T;
  sideEffects?: SideEffects;
}

export interface TransactionExists {
  transactionHash: string;
}
