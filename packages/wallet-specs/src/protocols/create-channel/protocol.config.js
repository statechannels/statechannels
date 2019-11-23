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
    funding: {},
    success: { type: 'final' },
  },
};
const guards = { amFirst: context => true, dataMatches: context => true };
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
