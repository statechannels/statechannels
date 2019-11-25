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
const guards = {
  amFirst: function(context) {
    return true;
  },
  dataMatches: function(context) {
    return true;
  },
};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
