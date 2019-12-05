const config = {
  key: 'create-channel',
  initial: 'initializeChannel',
  states: {
    initializeChannel: {
      invoke: { src: 'setChannelId', onDone: 'preFundSetup' },
      exit: {
        type: 'xstate.assign',
        assignment: function(ctx, _a) {
          var channelId = _a.channelId;
          return __assign(__assign({}, ctx), { channelId: channelId });
        },
      },
    },
    preFundSetup: {
      onEntry: 'sendOpenChannelMessage',
      invoke: {
        src: 'advanceChannel',
        data: function(_a) {
          var channelId = _a.channelId;
          return {
            channelId: channelId,
            targetTurnNum: i,
          };
        },
        onDone: 'funding',
      },
      on: { CHANNEL_CLOSED: 'abort' },
    },
    abort: { type: 'final' },
    funding: {
      invoke: {
        src: 'funding',
        data: function(_a) {
          var channelId = _a.channelId;
          return { channelId: channelId };
        },
        onDone: 'postFundSetup',
      },
    },
    postFundSetup: {
      invoke: {
        src: 'advanceChannel',
        data: function(_a) {
          var channelId = _a.channelId;
          return {
            channelId: channelId,
            targetTurnNum: i,
          };
        },
        onDone: 'success',
      },
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
