const config = {
  key: 'virtual-funding-as-leaf',
  initial: 'createChannels',
  states: {
    createChannels: {
      entry: 'assignChannels',
      type: 'parallel',
      states: {
        createGuarantorChannel: {
          invoke: { src: 'createNullChannel', data: 'guarantorChannelArgs' },
        },
        createJointChannel: {
          invoke: { src: 'createNullChannel', data: 'jointChannelArgs' },
        },
      },
      onDone: 'fundGuarantor',
    },
    fundGuarantor: {
      invoke: {
        src: 'supportState',
        data: 'guarantorOutcome',
        onDone: 'fundTarget',
      },
    },
    fundTarget: {
      invoke: { src: 'supportState', data: 'jointOutcome', onDone: 'success' },
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
