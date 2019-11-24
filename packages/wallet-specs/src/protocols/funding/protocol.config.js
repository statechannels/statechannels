const config = {
  key: 'funding',
  initial: 'determineStrategy',
  states: {
    determineStrategy: {
      on: { PROPOSAL_RECEIVED: { actions: 'assignProposal' } },
      initial: 'getClientChoice',
      states: {
        getClientChoice: {
          invoke: {
            id: 'ask-client-for-choice',
            src: 'askClient',
            onDone: { actions: ['sendClientChoice', 'assignClientChoice'] },
          },
          onDone: 'wait',
        },
        wait: {
          on: {
            '*': [
              {
                target: 'success',
                cond: 'consensus',
                actions: 'assignStrategy',
              },
              { target: 'retry', cond: 'disagreement' },
            ],
          },
        },
        success: { type: 'final' },
        retry: {
          entry: 'incrementTries',
          on: {
            '': [
              { target: 'failure', cond: 'maxTriesExceeded' },
              { target: 'getClientChoice' },
            ],
          },
        },
        failure: { type: 'final' },
      },
      onDone: [
        { target: 'fundDirectly', cond: 'directStrategyChosen' },
        { target: 'fundIndirectly', cond: 'indirectStrategyChosen' },
        { target: 'fundVirtually', cond: 'virtualStrategyChosen' },
      ],
    },
    fundDirectly: { invoke: 'directFunding', onDone: 'success' },
    fundIndirectly: { invoke: 'ledgerFunding', onDone: 'success' },
    fundVirtually: { invoke: 'virtualFunding', onDone: 'success' },
    success: { type: 'final' },
    failure: { type: 'final' },
  },
};
const guards = {
  consensus: function(x) {
    return true;
  },
  disagreement: function(x) {
    return true;
  },
  directStrategyChosen: function(x) {
    return true;
  },
  indirectStrategyChosen: function(x) {
    return true;
  },
  virtualStrategyChosen: function(x) {
    return true;
  },
  maxTriesExceeded: function(x) {
    return true;
  },
};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
