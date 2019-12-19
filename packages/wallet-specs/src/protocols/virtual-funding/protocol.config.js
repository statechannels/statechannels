const config = {
  key: 'virtual-funding',
  initial: 'chooseHub',
  states: {
    chooseHub: {
      entry: ['assignChoice', 'sendProposal'],
      on: { PROPOSAL_RECEIVED: { target: 'fund', cond: 'agreement' } },
    },
    fund: {
      invoke: { src: 'virtualFundAsLeaf', data: 'virtualFundAsLeafArgs' },
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
