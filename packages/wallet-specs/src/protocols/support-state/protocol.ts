import { Outcome, State } from '../..';
import { saveConfig } from '../../utils';

const PROTOCOL = 'support-state';

export interface Init {
  channelID: string;
  outcome: Outcome;
}

export type SendState = Init & { state: State };

/*
TODO: Define sendState
Do we abort? Or do we try to reach consensus on a later state?
*/
const waiting = {
  entry: ['assignState', 'sendState'],
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
