import {
  AnyEventObject,
  ConditionPredicate,
  Machine,
  MachineConfig,
} from 'xstate';
import { State, Store } from '../..';
import { saveConfig } from '../../utils';

const PROTOCOL = 'advance-channel';
/*
Fully determined: true

In the current wallet, the post-fund-setup version of advance-channel is responsible for
storing state updates as they come in.
In this spec, the store itself is responsible for that, so you can wait to spin up an
advance-channel protocol once app funding is confirmed.

Additionally, waiting until it's your turn isn't necessary once the channel is funded.
An app should refrain from taking an app move until the entire post-fund round is supported,
since their application updates are otherwise unenforcable.

Therefore, we send on entry into the protocol.
*/

export interface Init {
  channelId: string;
  targetTurnNum: number; // should either be numParticipants-1 or 2*numParticipants-1
}

const toSuccess = {
  target: 'success',
  cond: 'advanced',
};
const waiting = {
  entry: 'sendState',
  on: {
    CHANNEL_UPDATED: toSuccess,
    '': toSuccess,
  },
};

export const config: MachineConfig<Init, any, AnyEventObject> = {
  key: PROTOCOL,
  initial: 'waiting',
  states: {
    waiting,
    success: { type: 'final' },
  },
};

export type Guards = {
  advanced: ConditionPredicate<Init, AnyEventObject>;
};

export type Actions = {
  sendState: any;
};

{
  const guards: Guards = {
    advanced: context => true,
  };
  const actions: Actions = { sendState: ctx => true };
  saveConfig(config, __dirname, { guards, actions });
}

export function machine(store: Store, context?: Init) {
  const guards: Guards = {
    advanced: ({ channelId, targetTurnNum }: Init) => {
      const { latestSupportedState, unsupportedStates } = store.getEntry(
        channelId
      );

      return (
        !!latestSupportedState && latestSupportedState.turnNum >= targetTurnNum
      );
    },
  };

  const actions: Actions = {
    sendState: ({ channelId, targetTurnNum }: Init) => {
      const { latestSupportedState, unsupportedStates } = store.getEntry(
        channelId
      );
      const turnNum = targetTurnNum;
      if (!latestSupportedState) {
        store.sendState({ ...unsupportedStates[0].state, turnNum });
        return;
      }
      if (latestSupportedState.turnNum >= targetTurnNum) {
        return;
      } else {
        store.sendState({ ...latestSupportedState, turnNum });
      }
    },
  };

  const services = {};
  return Machine({ ...config, context }, { guards, actions, services });
}
