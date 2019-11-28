const config = {
  key: 'ledger-update',
  initial: 'createChannels',
  states: {
    createChannels: {
      type: 'parallel',
      states: {
        createLeftGuarantorChannel: {
          invoke: { src: 'createNullChannel', data: 'guarantorChannelArgs' },
        },
        createRightGuarantorChannel: {
          invoke: { src: 'createNullChannel', data: 'guarantorChannelArgs' },
        },
        createJointChannel: {
          invoke: { src: 'createNullChannel', data: 'jointChannelArgs' },
        },
      },
      onDone: 'fundGuarantors',
    },
    fundGuarantors: {
      type: 'parallel',
      states: {
        fundLeftGuarantor: {
          invoke: { src: 'supportState', data: 'guarantorOutcome' },
        },
        fundRightGuarantor: {
          invoke: { src: 'supportState', data: 'guarantorOutcome' },
        },
      },
      onDone: 'success',
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
