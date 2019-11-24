const config = {
  key: 'advance-channel',
  initial: 'waiting',
  states: {
    waiting: {
      entry: 'send',
      on: { '*': { target: 'success', cond: 'advanced' } },
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
