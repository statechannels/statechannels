const config = {
  key: 'create-null-channel',
  initial: 'checkChannel',
  states: {
    checkChannel: {
      invoke: {
        src: 'checkChannel',
        onDone: {
          target: 'preFundSetup',
          actions: {
            type: 'xstate.assign',
            assignment: function(ctx) {
              return __assign(__assign({}, ctx), {
                channelId: __2.getChannelId(ctx.channel),
              });
            },
          },
        },
      },
    },
    preFundSetup: {
      invoke: {
        src: 'supportState',
        data: function preFundData(_a) {
          var channelId = _a.channelId,
            outcome = _a.outcome;
          return {
            channelId: channelId,
            outcome: outcome,
          };
        },
        onDone: 'success',
        autoForward: true,
      },
    },
    success: {
      type: 'final',
      data: function(_a) {
        var channelId = _a.channelId;
        return { channelId: channelId };
      },
    },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
