const config = {
  key: 'virtual-defunding-as-leaf',
  initial: 'defundTarget',
  states: {
    defundTarget: {
      entry: 'assignChannels',
      invoke: {
        src: 'supportState',
        data: 'finalJointChannelUpdate',
        onDone: 'defundGuarantor',
      },
      exit: 'garbageCollecttargetChannel',
    },
    defundGuarantor: {
      invoke: {
        src: 'supportState',
        data: 'defundGuarantorInLedger',
        onDone: 'success',
      },
      exit: ['garbageCollectJointChannel', 'garbageCollectGuarantorChannel'],
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
