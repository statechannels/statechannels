import { DoneInvokeEvent, EventObject, Machine, MachineConfig, StateMachine } from 'xstate';

import { FINAL, ObsoleteStore } from '.';

/*
Since machines typically  don't have sync access to a store, we invoke a promise to get the
desired outcome; that outcome can then be forwarded to the invoked service.
*/

export function getDataAndInvoke<T>(data: string, src: string, onDone?: string, id?: string) {
  return {
    initial: data,
    states: {
      [data]: { invoke: { src: data, onDone: src } },
      [src]: {
        invoke: {
          id,
          src,
          data: (_, { data }: DoneInvokeEvent<T>) => data,
          onDone: 'done',
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
  store: ObsoleteStore,
  context?: I
) => StateMachine<I, any, E>;

type Options = (store: ObsoleteStore) => any;
type Config<T> = MachineConfig<T, any, any>;
export const connectToStore: <T>(config: Config<T>, options: Options) => MachineFactory<T, any> = <
  T
>(
  config: Config<T>,
  options: Options
) => (store: ObsoleteStore, context?: T | undefined) => {
  return Machine(config).withConfig(options(store), context);
};
