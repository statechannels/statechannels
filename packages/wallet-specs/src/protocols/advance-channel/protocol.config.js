const config = {
  key: 'advance-channel',
  initial: 'waiting',
  states: {
    waiting: {
      on: {
        CHANNEL_UPDATED: [
          { target: 'advanced', cond: 'advanced' },
          { actions: 'sendIfSafe' },
        ],
      },
      after: { '10000': 'failure' },
    },
    advanced: { type: 'final' },
    failure: { type: 'final' },
  },
  context: { channelID: '0xabc', targetTurnNum: 1 },
};
const guards = { advanced: context => true };
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
