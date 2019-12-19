const config = {
  key: 'support-state',
  initial: 'waiting',
  states: {
    waiting: {
      invoke: {
        src: 'sendState',
        onDone: { target: 'success', cond: 'supported' },
      },
    },
    success: { type: 'final' },
  },
  on: { '*': [{ target: 'success', cond: 'supported' }] },
};
const guards = {
  supported: function(context) {
    return true;
  },
};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
