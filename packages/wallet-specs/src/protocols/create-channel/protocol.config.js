const config = {
  key: 'create-channel',
  initial: 'initializeChannel',
  states: {
    initializeChannel: {
      entry: function() {
        return console.log('CREATING CHANNEL');
      },
      invoke: { src: 'setChannelId', onDone: 'preFundSetup' },
      exit: [
        {
          type: 'xstate.assign',
          assignment: {
            channelId: function(_, event) {
              return event.data.channelId;
            },
          },
        },
        function(ctx) {
          return console.log('Sending open channel message');
        },
      ],
    },
    preFundSetup: {
      invoke: {
        id: 'preFundSetup',
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
      on: {
        CHANNEL_CLOSED: 'abort',
        CHANNEL_UPDATED: {
          actions: {
            to: 'preFundSetup',
            type: 'xstate.send',
            event: function(_, event) {
              return event;
            },
            delay: undefined,
            id: '',
          },
        },
      },
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
        id: 'postFundSetup',
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
      on: {
        CHANNEL_UPDATED: {
          actions: {
            to: 'postFundSetup',
            type: 'xstate.send',
            event: function(_, event) {
              return event;
            },
            delay: undefined,
            id: '',
          },
        },
      },
    },
    success: {
      type: 'final',
      entry: {
        to: '#_parent',
        type: 'xstate.send',
        event: { type: 'CHANNEL_CREATED' },
        delay: undefined,
        id: 'CHANNEL_CREATED',
      },
    },
  },
};
const guards = {};
const customActions = {
  sendOpenChannelMessage: function(ctx) {
    return console.log('Sending open channel message');
  },
};
const machine = Machine(config, { guards, actions: customActions });
