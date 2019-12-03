const config = {
  key: 'virtual-defunding-as-hub',
  initial: 'defundGuarantors',
  states: {
    defundGuarantors: {
      type: 'parallel',
      states: {
        defundLeft: {
          invoke: { src: 'supportState', data: 'defundLeftGuarantor' },
          exit: 'garbageCollectLeftGuarantor',
        },
        defundRight: {
          invoke: { src: 'supportState', data: 'defundRightGuarantor' },
          exit: 'garbageCollectRightGuarantor',
        },
      },
      exit: 'garbageCollectJointChannel',
      onDone: 'success',
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
