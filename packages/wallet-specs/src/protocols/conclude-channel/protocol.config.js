const config = {
  key: 'conclude-channel',
  initial: 'waiting',
  states: {
    waiting: {
      entry: 'sendFinalState',
      on: { CHANNEL_UPDATED: [{ target: 'success', cond: 'supported' }] },
    },
    success: { type: 'final' },
  },
};
const guards = { supported: context => true };
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
