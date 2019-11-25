import { JsonRpcJoinChannelParams } from '../../json-rpc';
import { saveConfig } from '../../utils';

const PROTOCOL = 'join-channel';

/*
Spawned in a new process when the app calls JoinChannel
*/
export type Init = JsonRpcJoinChannelParams;

// I should ask my channel store if the channel nonce is ok
const checkNonce = {
  invoke: {
    src: 'checkNonce',
    onDone: 'askClient',
  },
};

const askClient = {
  invoke: {
    src: 'askClient',
  },
  on: {
    CLOSE_CHANNEL: 'abort',
    JOIN_CHANNEL: 'funding',
  },
};

const abort = {
  type: 'final',
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
  initial: 'checkNonce',
  states: {
    checkNonce,
    askClient,
    abort,
    funding,
    postFundSetup,
    success: { type: 'final' },
  },
};

export { config };

saveConfig(config, __dirname, { guards: {} });
