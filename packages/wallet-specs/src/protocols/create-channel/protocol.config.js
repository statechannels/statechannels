const config = {
  key: 'create-channel',
  initial: 'channelUnknown',
  states: {
    channelUnknown: {
      on: {
        '': { target: 'channelKnown', cond: 'amFirst', actions: 'sendState' },
        CHANNEL_UPDATED: {
          target: 'channelKnown',
          cond: 'dataMatches',
          actions: 'assignChannelId',
        },
      },
    },
    channelKnown: {
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
