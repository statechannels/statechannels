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
  channelID: string;
  targetTurnNum: number; // should either be numParticipants-1 or 2*numParticipants-1
}

const waiting = {
  entry: 'send',
  on: {
    CHANNEL_UPDATED: {
      target: 'success',
      cond: 'advanced',
    },
  },
};

const advanceChannelConfig = {
  key: PROTOCOL,
  initial: 'waiting',
  states: {
    waiting,
    success: { type: 'final' },
  },
};

const guards = {
  advanced: context => true,
};

saveConfig(advanceChannelConfig, __dirname, { guards });
