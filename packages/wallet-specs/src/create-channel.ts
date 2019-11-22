import { Address, Outcome, PrivateKey } from '.';
import { saveConfig } from './utils';

const PROTOCOL = 'create-channel';

interface CommonContext {
  ourIndex: number;
  participants: Address[];
  outcome: Outcome;
  appDefinition: Address;
  appData: string;
  privateKey: PrivateKey;
  clearedToSend: boolean;
}

interface ChannelUnknown {
  value: 'channel-unknown';
  context: CommonContext;
}

type Init = ChannelUnknown['context'];

// TODO: Figure out how to make the following types more systematic
type Guard = 'amFirst' | 'dataMatches';

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
    onDone: 'success',
    onError: 'failure',
  },
};

const createChannelConfig = {
  key: PROTOCOL,
  initial: 'channelUnknown',
  states: {
    channelUnknown,
    channelKnown,
    success: { type: 'final' },
    failure: { type: 'final' },
  },
};

// GRAPHICS

const dummyGuard = 'context => true';
const guards: Record<Guard, string> = {
  amFirst: dummyGuard,
  dataMatches: dummyGuard,
};

const sampleContext: Init = {
  participants: ['me', 'you'],
  privateKey: 'secret',
  ourIndex: 0,
  outcome: [],
  appData: '0x',
  appDefinition: 'contractAddress',
  clearedToSend: true,
};

export const config = { ...createChannelConfig, context: sampleContext };

saveConfig(config, { guards });
