import { Machine } from 'xstate';
import { MachineFactory, Outcome, outcomesEqual, State } from '../..';

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
const waiting = {
  invoke: {
    src: 'sendState',
    onDone: { target: 'success', cond: 'supported' },
  },
};

export const config = {
  key: PROTOCOL,
  initial: 'waiting',
  states: {
    waiting,
    success: { type: 'final' as 'final' },
  },
  on: {
    '*': [
      {
        target: 'success',
        cond: 'supported',
      },
    ],
  },
};

const mockGuards = { supported: context => true };
export const mockOptions = { guards: mockGuards };

type Services = {
  sendState(ctx: Init): any;
};
type Guards = {
  supported(ctx: Init): boolean;
};

type Options = {
  services: Services;
  guards: Guards;
};

export const machine: MachineFactory<Init, any> = (store, context: Init) => {
  const services: Services = {
    sendState: ({ channelId, outcome }: Init) => {
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
    supported: ({ channelId, outcome }: Init) => {
      const { latestSupportedState } = store.getEntry(channelId);
      if (!latestSupportedState) {
        return false;
      }

      return outcomesEqual(latestSupportedState.outcome, outcome);
    },
  };

  const options: Options = { services, guards };
  return Machine(config, options).withContext(context);
};
