const config = {
  key: 'create-channel',
  initial: 'chooseNonce',
  states: {
    chooseNonce: {
      onEntry: ['assignChannelID', 'sendOpenChannelMessage'],
      invoke: {
        src: 'advance-channel',
        data: 'passChannelId',
        onDone: 'funding',
      },
      on: { CHANNEL_CLOSED: 'abort' },
    },
    abort: {
      invoke: { src: 'concludeChannel', data: 'passChannelId' },
      onDone: 'success',
    },
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
