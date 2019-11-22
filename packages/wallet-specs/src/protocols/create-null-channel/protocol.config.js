const config = {
  key: 'create-null-channel',
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
      invoke: { src: 'supportState', data: 'supportStateArgs' },
      onDone: 'success',
      onError: 'failure',
    },
    success: { type: 'final' },
  },
};
const guards = { amFirst: context => true, dataMatches: context => true };
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
