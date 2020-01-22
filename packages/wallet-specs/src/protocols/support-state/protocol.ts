import { Machine } from 'xstate';
import { Outcome, State } from '@statechannels/nitro-protocol';

import { MachineFactory, outcomesEqual } from '../..';

const PROTOCOL = 'support-state';

export interface Init {
  channelId: string;
  outcome: Outcome;
}

export type SendState = Init & { state: State };

/*
What happens if sendState fails
Do we abort? Or do we try to reach consensus on a later state?
*/
const sendState = {
  invoke: { src: 'sendState', onDone: 'waiting' },
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
    success: { type: 'final' as 'final' },
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

export const machine: MachineFactory<Init, any> = (store, context: Init) => {
  const services: Services = {
    sendState: async ({ channelId, outcome }: Init) => {
      const { latestState } = store.getEntry(channelId);
      // TODO: Make this safe?
      if (!outcomesEqual(latestState.outcome, outcome)) {
        store.sendState({
          ...latestState,
          turnNum: latestState.turnNum + 1,
          outcome,
        });
      } else {
        store.sendState(latestState);
      }
    },
  };

  const guards: Guards = {
    supported: ({ channelId, outcome }: Init, e: any) => {
      const latestEntry = store.getEntry(channelId);
      if (!latestEntry.hasSupportedState) {
        return false;
      }
      return outcomesEqual(latestEntry.latestSupportedState.outcome, outcome);
    },
  };

  const options: Options = { services, guards };
  return Machine(config, options).withContext(context);
};
