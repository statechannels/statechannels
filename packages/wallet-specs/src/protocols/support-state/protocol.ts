import { State } from '../..';
import { saveConfig } from '../../utils';

const PROTOCOL = 'support-state';

export interface Init {
  channelID: string;
  state: State;
}

const waiting = {
  entry: 'sendState',
  on: {
    CHANNEL_UPDATED: [
      {
        target: 'success',
        cond: 'supported',
      },
    ],
  },
};

export const config = {
  key: PROTOCOL,
  initial: 'waiting',
  states: {
    waiting,
    success: { type: 'final' },
  },
};

const guards = {
  supported: context => true,
};

saveConfig(config, __dirname, { guards });
