import { DoneInvokeEvent, EventObject, StateMachine, MachineConfig, Machine } from 'xstate';

import { FINAL, Store } from '.';

/*
Since machines typically  don't have sync access to a store, we invoke a promise to get the
desired outcome; that outcome can then be forwarded to the invoked service.
*/

export function getDataAndInvoke<T>(
  data: string,
  src: string,
  onDone: string,
  autoForward = false
) {
  return {
    initial: data,
    states: {
      [data]: { invoke: { src: data, onDone: src } },
      [src]: {
        invoke: {
          src,
          data: (_, { data }: DoneInvokeEvent<T>) => data,
          onDone: 'done',
          autoForward,
        },
      },
      done: { type: FINAL },
    },
    onDone,
  };
}

// TODO
// Some machine factories require a context, and some don't
// Sort this out.
export type MachineFactory<I, E extends EventObject> = (
  store: Store,
  context?: I
) => StateMachine<I, any, E>;

export const connectToStore: <T>(
  config,
  options: (store: Store) => any
) => MachineFactory<T, any> = <T>(
  config: MachineConfig<T, any, any>,
  options: (store: Store) => any
) => (store: Store, context?: T | undefined) => {
  return Machine(config).withConfig(options(store), context);
};
