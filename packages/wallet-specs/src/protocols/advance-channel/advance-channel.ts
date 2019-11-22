import { MachineConfig } from 'xstate';

import { Entry, Failure } from '../../';
import { StoreEvent } from '../..//store';
import { saveConfig } from '../..//utils';

const PROTOCOL = 'advance-channel';

export interface AdvanceChannelSchema {
  states: {
    waiting: {};
    advanced: {};
    failure: {};
  };
}

interface AdvanceChannelContext {
  channelID: string;
  targetTurnNum: number;
}

type Context = AdvanceChannelContext | Failure;

const advanceChannelConfig: MachineConfig<
  Context,
  AdvanceChannelSchema,
  StoreEvent | Entry
> = {
  key: PROTOCOL,
  initial: 'waiting',
  states: {
    waiting: {
      on: {
        CHANNEL_UPDATED: [
          {
            target: 'advanced',
            cond: 'advanced',
          },
          {
            actions: 'sendIfSafe',
          },
        ],
      },
      after: { 10000: 'failure' },
    },
    advanced: { type: 'final' },
    failure: { type: 'final' },
  },
};

const guards = {
  advanced: 'context => true',
};

const sampleContext: Context = {
  channelID: '0xabc',
  targetTurnNum: 1,
};

saveConfig({ ...advanceChannelConfig, context: sampleContext }, { guards });

export { advanceChannelConfig };
