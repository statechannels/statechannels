const config = {
  key: 'advance-channel',
  initial: 'waiting',
  states: {
    waiting: {
      entry: 'sendState',
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
const customActions = {
  sendState: function(ctx) {
    return true;
  },
};
const machine = Machine(config, { guards, actions: customActions });
