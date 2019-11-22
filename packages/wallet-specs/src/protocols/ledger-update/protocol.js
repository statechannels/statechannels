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
  context: { channelID: '0xabc', currentTurnNumber: 7, goal: [] },
};
const guards = {
  consensusReached: context => true,
  dissent: context => false,
};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
