import { JsonRpcCreateChannelParams } from '../../json-rpc';
import { saveConfig } from '../../utils';

const PROTOCOL = 'create-channel';

/*
Spawned in a new process when the app calls CreateChannel
*/
export type Init = JsonRpcCreateChannelParams;

const chooseNonce = {
  onEntry: [
    'assignChannelID', // This should generate a nonce, and assign `channelID` to the context
    'sendOpenChannelMessage',
  ],
  invoke: {
    src: 'advance-channel',
    data: 'passChannelId',
    onDone: 'funding',
  },
};

const funding = {
  invoke: {
    src: 'funding',
    data: 'passChannelId',
  },
  onDone: 'postFundSetup',
};

const postFundSetup = {
  invoke: {
    src: 'advance-channel',
    data: 'passChannelId',
  },
  onDone: 'success',
};

const config = {
  key: PROTOCOL,
  initial: 'chooseNonce',
  states: {
    chooseNonce,
    funding,
    postFundSetup,
    success: { type: 'final' },
  },
};

export { config };

saveConfig(config, __dirname, { guards: {} });
