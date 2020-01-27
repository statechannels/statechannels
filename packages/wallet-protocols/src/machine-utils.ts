import { DoneInvokeEvent } from 'xstate';

import { FINAL } from '.';

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
