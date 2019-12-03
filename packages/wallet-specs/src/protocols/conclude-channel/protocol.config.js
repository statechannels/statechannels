const config = {
  key: 'conclude-channel',
  initial: 'concludeTarget',
  states: {
    concludeTarget: {
      invoke: { src: 'supportState', data: 'finalState' },
      onDone: [
        { target: 'virtualDefunding', cond: 'virtuallyFunded' },
        { target: 'success', cond: 'directlyFunded' },
        { target: 'ledgerDefunding', cond: 'indirectlyFunded' },
      ],
    },
    virtualDefunding: {
      initial: 'start',
      states: {
        start: {
          on: {
            '': [
              { target: 'asLeaf', cond: 'amLeaf' },
              { target: 'asHub', cond: 'amHub' },
            ],
          },
        },
        asLeaf: {
          invoke: {
            src: 'virtualDefundingAsLeaf',
            data: 'virtualDefundingAsLeafArgs',
            onDone: 'success',
          },
        },
        asHub: {
          invoke: {
            src: 'virtualDefundingAsHub',
            data: 'virtualDefundingAsHubArgs',
            onDone: 'success',
          },
        },
        success: { type: 'final' },
      },
      onDone: 'success',
    },
    ledgerDefunding: {
      invoke: {
        src: 'ledgerDefunding',
        data: 'ledgerDefundingArgs',
        onDone: 'success',
      },
    },
    success: { type: 'final' },
  },
};
const guards = {
  virtuallyFunded: function(_) {
    return true;
  },
  indirectlyFunded: function(_) {
    return true;
  },
  directlyFunded: function(_) {
    return true;
  },
};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
