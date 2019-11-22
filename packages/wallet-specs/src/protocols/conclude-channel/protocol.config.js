const config = {
  key: 'conclude-channel',
  initial: 'waiting',
  states: {
    waiting: {
      invoke: { src: 'supportState', data: 'finalState' },
      onDone: 'success',
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
