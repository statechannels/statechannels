const config = {
  key: 'advance-channel',
  initial: 'sendingState',
  states: {
    sendingState: { invoke: { src: 'sendState', onDone: 'waiting' } },
    waiting: {
      on: {
        CHANNEL_UPDATED: { target: 'success', cond: 'advanced' },
        '': { target: 'success', cond: 'advanced' },
      },
    },
    success: { type: 'final' },
  },
};
const guards = {
  advanced: function(context) {
    return true;
  },
};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
