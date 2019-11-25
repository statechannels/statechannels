const config = {
  key: 'join-channel',
  initial: 'checkNonce',
  states: {
    checkNonce: { invoke: { src: 'checkNonce', onDone: 'askClient' } },
    askClient: {
      invoke: { src: 'askClient' },
      on: { CLOSE_CHANNEL: 'abort', JOIN_CHANNEL: 'funding' },
    },
    abort: { type: 'final' },
    funding: {
      invoke: { src: 'funding', data: 'passChannelId' },
      onDone: 'postFundSetup',
    },
    postFundSetup: {
      invoke: { src: 'advance-channel', data: 'passChannelId' },
      onDone: 'success',
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
