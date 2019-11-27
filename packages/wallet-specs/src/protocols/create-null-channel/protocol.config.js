const config = {
  key: 'create-null-channel',
  initial: 'checkChannel',
  states: {
    checkChannel: {
      entry: 'assignChannelId',
      on: { '': [{ target: 'preFundSetup', cond: 'channelOK' }, 'abort'] },
    },
    preFundSetup: {
      invoke: { src: 'supportState', data: 'supportStateArgs' },
      onDone: 'success',
      onError: 'failure',
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
