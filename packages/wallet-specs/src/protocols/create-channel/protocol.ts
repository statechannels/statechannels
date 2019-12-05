import { assign, InvokeCreator } from 'xstate';
import { AdvanceChannel } from '..';
import { Channel, State, store, success } from '../..';
import { ChannelStoreEntry } from '../../ChannelStoreEntry';
import { JsonRpcCreateChannelParams } from '../../json-rpc';
import { saveConfig } from '../../utils';

const PROTOCOL = 'create-channel';

/*
Spawned in a new process when the app calls CreateChannel
*/
export type Init = JsonRpcCreateChannelParams;

type ChannelSet = Init & { channelId: string };
export interface SetChannel {
  type: 'CHANNEL_INITIALIZED';
  channelId: string;
}
const assignChannelId = assign(
  (ctx: Init, { channelId }: SetChannel): ChannelSet => ({
    ...ctx,
    channelId,
  })
);

export const advanceChannelArgs = (i: 1 | 3) => ({
  channelId,
}: ChannelSet): AdvanceChannel.Init => ({
  channelId,
  targetTurnNum: i,
});
const initializeChannel = {
  invoke: {
    src: 'setChannelId',
    onDone: 'preFundSetup',
  },
  exit: assignChannelId,
};
const preFundSetup = {
  onEntry: 'sendOpenChannelMessage',
  invoke: {
    src: 'advanceChannel',
    data: advanceChannelArgs(1),
    onDone: 'funding',
  },
  on: {
    CHANNEL_CLOSED: 'abort',
  },
};

const abort = success;

const funding = {
  invoke: {
    src: 'funding',
    data: ({ channelId }: ChannelSet) => ({ channelId }),
  },
  onDone: 'postFundSetup',
};

const postFundSetup = {
  invoke: {
    src: 'advanceChannel',
    data: advanceChannelArgs(3),
  },
  onDone: 'success',
};

const config = {
  key: PROTOCOL,
  initial: 'initializeChannel',
  states: {
    initializeChannel,
    preFundSetup,
    abort,
    funding,
    postFundSetup,
    success,
  },
};

export { config };

saveConfig(config, __dirname, { guards: {} });
