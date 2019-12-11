const config = {
  key: 'funding',
  initial: 'determineStrategy',
  states: {
    determineStrategy: {
      on: {
        FUNDING_STRATEGY_PROPOSED: {
          actions: {
            type: 'xstate.assign',
            assignment: function(ctx, _a) {
              var choice = _a.choice;
              return __assign(__assign({}, ctx), { peerChoice: choice });
            },
          },
        },
      },
      initial: 'getClientChoice',
      states: {
        getClientChoice: {
          invoke: {
            id: 'ask-client-for-choice',
            src: 'askClient',
            onDone: {
              target: 'wait',
              actions: [
                'sendClientChoice',
                {
                  type: 'xstate.assign',
                  assignment: function(ctx, _a) {
                    var clientChoice = _a.data;
                    return __assign(__assign({}, ctx), {
                      clientChoice: clientChoice,
                    });
                  },
                },
              ],
            },
          },
        },
        wait: {
          on: {
            '': [
              { target: 'success', cond: 'consensus' },
              { target: 'retry', cond: 'disagreement' },
            ],
            '*': [
              { target: 'success', cond: 'consensus' },
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
    fundDirectly: { invoke: { src: 'directFunding', onDone: 'success' } },
    fundIndirectly: {
      invoke: {
        src: 'ledgerFunding',
        data: function(_a) {
          var targetChannelId = _a.targetChannelId;
          return { targetChannelId: targetChannelId };
        },
        onDone: 'success',
        autoForward: true,
      },
    },
    fundVirtually: { invoke: { src: 'virtualFunding', onDone: 'success' } },
    success: { type: 'final' },
    failure: { type: 'final' },
  },
};
const guards = {
  consensus: function(_a) {
    var clientChoice = _a.clientChoice,
      peerChoice = _a.peerChoice;
    return !!clientChoice && clientChoice === peerChoice;
  },
  disagreement: function(_a) {
    var clientChoice = _a.clientChoice,
      peerChoice = _a.peerChoice;
    return clientChoice && peerChoice && clientChoice !== peerChoice;
  },
  directStrategyChosen: function(_a) {
    var clientChoice = _a.clientChoice;
    return clientChoice === 'Direct';
  },
  indirectStrategyChosen: function(_a) {
    var clientChoice = _a.clientChoice;
    return clientChoice === 'Indirect';
  },
  virtualStrategyChosen: function(_a) {
    var clientChoice = _a.clientChoice;
    return clientChoice === 'Virtual';
  },
  maxTriesExceeded: function() {
    return true;
  },
};
const customActions = {
  sendClientChoice: function(ctx) {
    console.log('Sending ' + __2.pretty(strategyChoice(ctx)));
  },
  assignClientChoice: {
    type: 'xstate.assign',
    assignment: function(ctx, _a) {
      var clientChoice = _a.data;
      return __assign(__assign({}, ctx), { clientChoice: clientChoice });
    },
  },
};
const machine = Machine(config, { guards, actions: customActions });
