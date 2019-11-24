import { Address, Outcome, PrivateKey, store } from '../../';
import { saveConfig } from '../../utils';
import { Init as SupportStateArgs } from '../support-state/protocol';

const PROTOCOL = 'create-null-channel';

interface Init {
  participants: Address[];
  outcome: Outcome;
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

type ChannelKnown = Init & { channelID: string };

function supportStateArgs({ channelID }: ChannelKnown): SupportStateArgs {
  const states = store.getUnsupportedStates(channelID);
  if (states.length !== 1) {
    throw new Error('Unexpected states');
  }
  return {
    channelID,
    state: states[0].state,
  };
}

const channelKnown = {
  invoke: {
    src: 'supportState',
    data: 'supportStateArgs',
  },
  onDone: 'success',
  onError: 'failure',
};

const config = {
  key: PROTOCOL,
  initial: 'channelUnknown',
  states: {
    channelUnknown,
    channelKnown,
    success: { type: 'final' },
  },
};

// GRAPHICS

const dummyGuard = context => true;
const guards = {
  amFirst: dummyGuard,
  dataMatches: dummyGuard,
};

saveConfig(config, __dirname, { guards });
