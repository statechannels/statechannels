const config = {
  key: 'join-channel',
  initial: 'checkNonce',
  states: {
    checkNonce: {
      on: { OPEN_CHANNEL: { target: 'askClient', cond: 'nonceOk' } },
      exit: 'storeState',
    },
    askClient: {
      invoke: {
        src: 'askClient',
        onDone: [
          {
            target: 'preFundSetup',
            cond: function(_a, event) {
              return event.data === 'JOIN_CHANNEL';
            },
          },
          {
            target: 'abort',
            cond: function(_a, event) {
              return event.data === 'CLOSE_CHANNEL';
            },
          },
        ],
      },
    },
    abort: { entry: 'sendCloseChannel', type: 'final' },
    preFundSetup: {
      invoke: {
        id: 'preFundSetup',
        src: 'advanceChannel',
        data: function(_a) {
          var channelId = _a.channelId;
          return {
            channelId: channelId,
            targetTurnNum: n,
          };
        },
        onDone: 'funding',
      },
      on: {
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
    funding: {
      invoke: {
        src: 'funding',
        data: function(_a) {
          var channelId = _a.channelId;
          return {
            targetChannelId: channelId,
            tries: 0,
          };
        },
        onDone: 'postFundSetup',
        autoForward: true,
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
            targetTurnNum: n,
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
        event: { type: 'CHANNEL_JOINED' },
        delay: undefined,
        id: 'CHANNEL_JOINED',
      },
    },
  },
};
const guards = {
  nonceOk: function() {
    return true;
  },
};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
