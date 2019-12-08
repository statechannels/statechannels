const config = {
  key: 'wallet',
  initial: 'running',
  context: { processes: [] },
  states: {
    running: {
      on: {
        OPEN_CHANNEL: { actions: 'spawnJoinChannel' },
        CREATE_CHANNEL: { actions: 'spawnCreateChannel' },
        '*': {
          actions: function forwardToChildren(_ctx, event, _a) {
            var state = _a.state;
            Object.values(state.children).forEach(function(child) {
              return child.send(event);
            });
          },
        },
      },
    },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
