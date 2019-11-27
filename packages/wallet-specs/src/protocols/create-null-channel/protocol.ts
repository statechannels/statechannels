import { Channel, Outcome, store } from '../../';
import { saveConfig } from '../../utils';
import { Init as SupportStateArgs } from '../support-state/protocol';

const PROTOCOL = 'create-null-channel';
/*
Creating a null-channel seems sufficiently different from creating an app channel
that it's worth having its own protocol.

The differences are:
- it's the responsibility of the parent protocol to provide the nonce
- creating a null channel is symmetric; all participants sign the same preFundSetup state
- create-null-channel is not responsible for funding the channel

These differences allow create-null-channel to be fully-determined.
*/

export interface Init {
  channel: Channel;
  outcome: Outcome;
}

type Context = Init & { channelID: string };

function supportStateArgs({ channelID }: Context): SupportStateArgs {
  const states = store.getUnsupportedStates(channelID);
  if (states.length !== 1) {
    throw new Error('Unexpected states');
  }
  return {
    channelID,
    state: states[0].state,
  };
}

function channelOK({ channel, outcome }): boolean {
  // Should check that the nonce is used, that we have the private key for one of the signers, etc
  return true;
}

const checkChannel = {
  entry: 'assignChannelId', // for convenience
  on: {
    '': [
      {
        target: 'preFundSetup',
        cond: 'channelOK',
      },
      'abort',
    ],
  },
};

const preFundSetup = {
  invoke: {
    src: 'supportState',
    data: 'supportStateArgs',
  },
  onDone: 'success',
  onError: 'failure',
};

const config = {
  key: PROTOCOL,
  initial: 'checkChannel',
  states: {
    checkChannel,
    preFundSetup,
    success: { type: 'final' },
  },
};

const dummyGuard = context => true;
const guards = {
  amFirst: dummyGuard,
  dataMatches: dummyGuard,
};

saveConfig(config, __dirname, { guards });
