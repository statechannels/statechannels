import { Address, Outcome, PrivateKey } from '../../';
import { saveConfig } from '../../utils';

const PROTOCOL = 'create-channel';

export interface Init {
  participants: Address[];
  outcome: Outcome;
  appDefinition: Address;
  appData: string;
  privateKey: PrivateKey;
}

const channelUnknown = {
  on: {
    '': {
      target: 'channelKnown',
      cond: 'amFirst',
      actions: 'sendState',
    },
    CHANNEL_UPDATED: {
      target: 'channelKnown',
      cond: 'dataMatches',
      actions: 'assignChannelId',
    },
  },
};

const channelKnown = {
  invoke: {
    src: 'advance-channel',
    data: 'passChannelId',
    onDone: 'funding',
  },
};

const config = {
  key: PROTOCOL,
  initial: 'channelUnknown',
  states: {
    channelUnknown,
    channelKnown,
    funding: {}, // TODO
    success: { type: 'final' },
  },
};

const dummyGuard = 'context => true';
const guards = {
  amFirst: dummyGuard,
  dataMatches: dummyGuard,
};

saveConfig(config, { guards });
