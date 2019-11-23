import { saveConfig } from '../../utils';

const PROTOCOL = 'advance-channel';
/*
In the current wallet, the post-fund-setup version of advance-channel is responsible for
storing state updates as they come in.
In this spec, the store itself is responsible for that, so you can simply spin up an
advance-channel protocol once app funding is confirmed.

Additionally, waiting until it's your turn isn't necessary once the channel is funded.
Therefore, we send on entry into the protocol
*/

interface Init {
  channelID: string;
  targetTurnNum: number;
}

const waiting = {
  entry: 'send',
  on: {
    '*': {
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
  advanced: 'context => true',
};

saveConfig(advanceChannelConfig, { guards });
