const config = {
  key: 'ledger-update',
  initial: 'waiting',
  states: {
    waiting: {
      entry: ['assignCurrentTurnNumber', 'sendVote'],
      on: {
        '*': [
          { target: 'success', cond: 'consensusReached' },
          { target: 'failure', cond: 'dissent' },
        ],
      },
    },
    success: { type: 'final' },
    failure: { type: 'final' },
  },
};
const guards = {
  consensusReached: function(context) {
    return true;
  },
  dissent: function(context) {
    return false;
  },
};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
