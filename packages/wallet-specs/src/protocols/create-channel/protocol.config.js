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
        onDone: 'success',
        onError: 'failure',
      },
    },
    success: { type: 'final' },
    failure: { type: 'final' },
  },
  context: {
    participants: ['me', 'you'],
    privateKey: 'secret',
    ourIndex: 0,
    outcome: [],
    appData: '0x',
    appDefinition: 'contractAddress',
    clearedToSend: true,
  },
};
const guards = { amFirst: context => true, dataMatches: context => true };
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
