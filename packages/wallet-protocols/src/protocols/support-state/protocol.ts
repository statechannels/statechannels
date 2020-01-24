import { Machine } from 'xstate';
import { State, getChannelId } from '@statechannels/nitro-protocol';

import { MachineFactory, FINAL, statesEqual } from '../..';
import { IStore } from '../../store';

const PROTOCOL = 'support-state';

export interface Init {
  state: State;
}

/*
TODO
What happens if sendState fails?
Do we abort? Or do we try to reach consensus on a later state?
*/
const sendState = {
  invoke: { src: 'sendState', onDone: 'waiting', onError: 'failure' },
};

const waiting = {
  on: {
    '': { target: 'success', cond: 'supported' },
    '*': { target: 'success', cond: 'supported' },
  },
};

export const config = {
  key: PROTOCOL,
  initial: 'sendState',
  states: {
    sendState,
    waiting,
    success: { type: FINAL },
    failure: {
      entry: () => {
        throw "Can't support this state";
      },
    },
  },
};

const mockGuards = { supported: context => true };
export const mockOptions = { guards: mockGuards };

type Services = {
  sendState(ctx: Init): any;
};
type Guards = {
  supported(ctx: Init, e: any): boolean;
};

type Options = {
  services: Services;
  guards: Guards;
};

export type machine = typeof machine;
export const machine: MachineFactory<Init, any> = (store: IStore, context: Init) => {
  const services: Services = {
    sendState: async ({ state }: Init) => {
      const entry = store.getEntry(getChannelId(state.channel));
      const { latestStateSupportedByMe, hasSupportedState } = entry;
      // TODO: Should these safety checks be performed in the store?
      if (
        // If we've haven't already signed a state, there's no harm in supporting one.
        !latestStateSupportedByMe ||
        // If we've already supported this state, we might as well re-send it.
        statesEqual(latestStateSupportedByMe, state) ||
        // Otherwise, we only send it if we haven't signed any new states.
        (hasSupportedState &&
          statesEqual(entry.latestSupportedState, latestStateSupportedByMe) &&
          entry.latestSupportedState.turnNum < state.turnNum)
      ) {
        await store.sendState(state);
      } else {
        throw 'Not safe to send';
      }
    },
  };

  const guards: Guards = {
    supported: ({ state }: Init) => {
      const entry = store.getEntry(getChannelId(state.channel));
      if (!entry.hasSupportedState) {
        return false;
      }

      return statesEqual(entry.latestSupportedState, state);
    },
  };

  const options: Options = { services, guards };
  return Machine(config, options).withContext(context);
};
