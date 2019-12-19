const config = {
  key: 'wallet',
  initial: 'running',
  context: { processes: [], id: 'unknown' },
  states: {
    running: {
      on: {
        OPEN_CHANNEL: { actions: 'spawnJoinChannel' },
        CREATE_CHANNEL: { actions: 'spawnCreateChannel' },
        '*': {
          actions: [
            'updateStore',
            function forwardToChildren(_ctx, event, _a) {
              var state = _a.state;
              switch (event.type) {
                case 'FUNDING_STRATEGY_PROPOSED':
                  state.context.processes.forEach(function(_a) {
                    var ref = _a.ref;
                    return ref.send(event);
                  });
                  break;
                case 'CREATE_CHANNEL':
                case 'OPEN_CHANNEL':
                case 'SendStates':
                  break;
                default:
                  __2.unreachable(event);
              }
            },
          ],
        },
      },
    },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
