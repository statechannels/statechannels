const config = {
  key: 'ledger-update',
  initial: 'createChannels',
  states: {
    createChannels: {
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
        onDone: 'success',
      },
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
