import {MachineConfig, Machine, StateMachine, assign, Action} from 'xstate';
import {
  FINAL,
  MachineFactory,
  CreateChannelEvent,
  OpenChannelEvent,
  CreateChannel,
  JoinChannel,
  ConcludeChannel,
  Store,
  SendStates,
  ChannelUpdated,
  ChannelStoreEntry
} from '@statechannels/wallet-protocols';

import {State, getChannelId} from '@statechannels/nitro-protocol';

import {sendDisplayMessage, dispatchChannelUpdatedMessage} from '../messaging';

interface Context {
  channelId?: string;
}
interface Actions {
  sendToOpponent: Action<Context, PlayerStateUpdate>;
  updateStore: Action<Context, SendStates>;
  hideUi: Action<Context, any>;
  displayUi: Action<Context, any>;
  assignChannelId: Action<Context, any>;
  sendChannelUpdatedNotification: Action<Context, ChannelUpdated>;
}

// a config isn't all wired up
// a machine is something that's all wired up

// Events
type OpenEvent = CreateChannelEvent | OpenChannelEvent;

interface PlayerStateUpdate {
  type: 'PLAYER_STATE_UPDATE';
  state: State;
}
interface PlayerRequestConclude {
  type: 'PLAYER_REQUEST_CONCLUDE';
  channelId: string;
}
type Event = PlayerRequestConclude | PlayerStateUpdate | SendStates | OpenEvent | ChannelUpdated;

export type ApplicationWorkflowEvent = Event;

const generateConfig = (actions: Actions): MachineConfig<Context, any, Event> => ({
  id: 'application-workflow',
  initial: 'initializing',
  states: {
    initializing: {on: {CREATE_CHANNEL: 'create', OPEN_CHANNEL: 'join'}},
    join: {
      entry: [actions.assignChannelId, actions.displayUi],
      invoke: {
        id: 'joinMachine',
        src: 'invokeJoinMachine',
        data: (context, event) => event,
        onDone: {target: 'running', actions: [actions.hideUi]},
        autoForward: true
      },
      on: {
        SendStates: {actions: [actions.updateStore]},
        CHANNEL_UPDATED: {actions: [actions.sendChannelUpdatedNotification]}
      }
    },
    create: {
      entry: [actions.displayUi],
      invoke: {
        id: 'createMachine',
        src: 'invokeCreateMachine',
        data: (context, event) => event,
        onDone: {target: 'running', actions: [actions.hideUi, actions.assignChannelId]},
        autoForward: true
      },
      on: {
        SendStates: {actions: [actions.updateStore]},
        CHANNEL_UPDATED: {actions: [actions.sendChannelUpdatedNotification]}
      }
    },
    running: {
      on: {
        PLAYER_STATE_UPDATE: {target: 'running', actions: [actions.sendToOpponent]},
        CHANNEL_UPDATED: [
          {
            cond: 'channelOpen',
            target: 'running',
            actions: [actions.sendChannelUpdatedNotification]
          },
          {
            cond: 'channelClosing',
            target: 'closing',
            actions: [actions.sendChannelUpdatedNotification]
          }
        ],
        SendStates: [{target: 'running', actions: [actions.updateStore]}],
        PLAYER_REQUEST_CONCLUDE: {target: 'closing'}
      }
    },
    closing: {
      entry: actions.displayUi,
      exit: actions.hideUi,
      invoke: {
        id: 'closingMachine',
        src: 'invokeClosingMachine',
        data: (context, event) => context,
        autoForward: true
      },
      on: {
        SendStates: {actions: actions.updateStore},
        CHANNEL_UPDATED: [
          {cond: 'channelClosed', target: 'done', actions: actions.sendChannelUpdatedNotification},
          {target: 'closing', actions: actions.sendChannelUpdatedNotification}
        ]
      }
    },
    done: {type: FINAL}
  }
});

export const applicationWorkflow: MachineFactory<Context, any> = (
  store: Store,
  context: Context
) => {
  // Always use an empty context instead of undefined
  if (!context) {
    context = {};
  }

  const actions: Actions = {
    updateStore: (context, event) => {
      store.receiveStates(
        // TODO: The outcome can get removed when going over the wire if it's empty
        // For now we just add it back here
        event.signedStates.map(ss => ({
          state: {outcome: [], ...ss.state},
          signatures: ss.signatures
        }))
      );
    },
    sendToOpponent: (context, event) => {
      store.sendState(event.state);
    },
    sendChannelUpdatedNotification: (context, event) => {
      if (event.entry.states.length > 0) {
        const channelId = getChannelId(event.entry.states[0].state.channel);
        // TODO: We should filter by context.channelId but that is not being set currently
        dispatchChannelUpdatedMessage(channelId, new ChannelStoreEntry(event.entry));
      }
    },
    displayUi: (context, event) => {
      sendDisplayMessage('Show');
    },
    hideUi: (context, event) => {
      sendDisplayMessage('Hide');
    },
    assignChannelId: assign((context, event) => {
      if (!context.channelId) {
        if (event.type === 'PLAYER_STATE_UPDATE') {
          return {channelId: getChannelId(event.state.channel)};
        } else if (event.type === 'OPEN_CHANNEL') {
          return {channelId: getChannelId(event.signedState.state.channel)};
        } else if (event.type === 'done.invoke.createMachine') {
          return event.data;
        }
        return {};
      }
      return {};
    })
  };

  const config = generateConfig(actions);

  const invokeJoinMachine = (
    context,
    event: OpenChannelEvent
  ): StateMachine<any, any, any, any> => {
    return JoinChannel.machine(store, event);
  };
  const invokeCreateMachine = (
    context,
    event: CreateChannelEvent
  ): StateMachine<any, any, any, any> => {
    return CreateChannel.machine(store);
  };

  const invokeClosingMachine = (context: Context) => {
    if (!context.channelId) {
      throw new Error('No channel id');
    }
    return ConcludeChannel.machine(store, {channelId: context.channelId});
  };

  const channelOpen = (context: Context, event: ChannelUpdated): boolean => {
    return !channelClosing(context, event);
  };
  const channelClosing = (context: Context, event: ChannelUpdated): boolean => {
    if (!context || !context.channelId) {
      return false;
    }
    if (event.channelId !== context.channelId) {
      return false;
    }
    const channelStoreEntry = new ChannelStoreEntry(event.entry);
    return channelStoreEntry.latestState.isFinal;
  };

  const channelClosed = (context: Context, event: ChannelUpdated): boolean => {
    if (!context || !context.channelId) {
      return false;
    }
    if (event.channelId !== context.channelId) {
      return false;
    }
    const channelStoreEntry = new ChannelStoreEntry(event.entry);
    return channelStoreEntry.hasSupportedState && channelStoreEntry.latestSupportedState.isFinal;
  };

  const guards = {channelOpen, channelClosing, channelClosed};
  const services = {invokeClosingMachine, invokeCreateMachine, invokeJoinMachine};
  const options = {
    services,
    guards
  };
  return Machine(config).withConfig(options, context);
};

const mockServices = {
  invokeCreateMachine: () => {
    /* mock, do nothing  */
  },
  invokeJoinMachine: () => {
    /* mock, do nothing  */
  },
  invokeClosingMachine: () => {
    /* mock, do nothing  */
  }
};
const mockActions: Actions = {
  sendToOpponent: 'sendToOpponent',
  updateStore: 'updateStore',
  sendChannelUpdatedNotification: 'sendChannelUpdatedNotification',
  hideUi: 'hideUi',
  displayUi: 'displayUi',
  assignChannelId: 'assignChannelId'
};

export const config = generateConfig(mockActions);
const mockGuards = {channelOpen: () => true, channelClosing: () => true};
export const mockOptions = {services: mockServices, actions: mockActions, guards: mockGuards};
