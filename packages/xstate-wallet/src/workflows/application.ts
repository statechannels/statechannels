import {MachineConfig, Machine, StateMachine, assign} from 'xstate';
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
export type ApplicationWorkflowEvent =
  | PlayerRequestConclude
  | PlayerStateUpdate
  | SendStates
  | OpenEvent;

// Context
interface ApplicationContext {
  channelId?: string;
}
// States
const initializing = {on: {CREATE_CHANNEL: 'create', OPEN_CHANNEL: 'join'}};
const join = {
  entry: ['assignChannelId', 'displayUi'],
  invoke: {
    id: 'joinMachine',
    src: 'invokeJoinMachine',
    data: (context, event) => event,
    onDone: {target: 'running', actions: ['hideUi']},
    autoForward: true
  },
  on: {
    SendStates: {actions: ['updateStore']},
    CHANNEL_UPDATED: {actions: ['sendChannelUpdatedNotification']}
  }
};
const create = {
  entry: ['displayUi'],
  invoke: {
    id: 'createMachine',
    src: 'invokeCreateMachine',
    data: (context, event) => event,
    onDone: {target: 'running', actions: ['hideUi', 'assignChannelId']},
    autoForward: true
  },
  on: {
    SendStates: {actions: ['updateStore']},
    CHANNEL_UPDATED: {actions: ['sendChannelUpdatedNotification']}
  }
};

const running = {
  on: {
    PLAYER_STATE_UPDATE: {target: 'running', actions: ['sendToOpponent']},
    CHANNEL_UPDATED: [
      {cond: 'channelOpen', target: 'running', actions: ['sendChannelUpdatedNotification']},
      {cond: 'channelClosing', target: 'closing', actions: ['sendChannelUpdatedNotification']}
    ],
    SendStates: [{target: 'running', actions: ['updateStore']}],
    PLAYER_REQUEST_CONCLUDE: {target: 'closing'}
  }
};
const closing = {
  entry: ['displayUi'],
  exit: ['hideUi'],
  invoke: {
    id: 'closingMachine',
    src: 'invokeClosingMachine',
    data: (context, event) => context,
    autoForward: true
  },
  on: {
    SendStates: {actions: ['updateStore']},
    CHANNEL_UPDATED: [
      {cond: 'channelClosed', target: 'done', actions: ['sendChannelUpdatedNotification']},
      {target: 'closing', actions: ['sendChannelUpdatedNotification']}
    ]
  }
};
const done = {type: FINAL};

export const config: MachineConfig<any, any, any> = {
  initial: 'initializing',
  states: {initializing, join, create, running, closing, done}
};

export const applicationWorkflow: MachineFactory<ApplicationContext, any> = (
  store: Store,
  context: ApplicationContext
) => {
  // Always use an empty context instead of undefined
  if (!context) {
    context = {};
  }
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
  const updateStore = (context, event: SendStates) => {
    store.receiveStates(
      // TODO: The outcome can get removed when going over the wire if it's empty
      // For now we just add it back here
      event.signedStates.map(ss => ({state: {outcome: [], ...ss.state}, signatures: ss.signatures}))
    );
  };
  const sendToOpponent = (context, event: PlayerStateUpdate) => {
    store.sendState(event.state);
  };
  const sendChannelUpdatedNotification = (context, event: ChannelUpdated) => {
    if (event.entry.states.length > 0) {
      const channelId = getChannelId(event.entry.states[0].state.channel);
      // TODO: We should filter by context.channelId but that is not being set currently
      dispatchChannelUpdatedMessage(channelId, new ChannelStoreEntry(event.entry));
    }
  };
  const displayUi = (context, event) => {
    sendDisplayMessage('Show');
  };
  const hideUi = (context, event) => {
    sendDisplayMessage('Hide');
  };

  const invokeClosingMachine = (context: ApplicationContext) => {
    if (!context.channelId) {
      throw new Error('No channel id');
    }
    return ConcludeChannel.machine(store, {channelId: context.channelId});
  };

  const channelOpen = (context: ApplicationContext, event: ChannelUpdated): boolean => {
    return !channelClosing(context, event);
  };
  const channelClosing = (context: ApplicationContext, event: ChannelUpdated): boolean => {
    if (!context || !context.channelId) {
      return false;
    }
    if (event.channelId !== context.channelId) {
      return false;
    }
    const channelStoreEntry = new ChannelStoreEntry(event.entry);
    return channelStoreEntry.latestState.isFinal;
  };

  const channelClosed = (context: ApplicationContext, event: ChannelUpdated): boolean => {
    if (!context || !context.channelId) {
      return false;
    }
    if (event.channelId !== context.channelId) {
      return false;
    }
    const channelStoreEntry = new ChannelStoreEntry(event.entry);
    return channelStoreEntry.hasSupportedState && channelStoreEntry.latestSupportedState.isFinal;
  };

  const assignChannelId = assign(
    (
      context: ApplicationContext,
      event: any // TODO Proper typing
    ) => {
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
    }
  );

  const guards = {channelOpen, channelClosing, channelClosed};
  const services = {invokeClosingMachine, invokeCreateMachine, invokeJoinMachine};
  const actions = {
    sendToOpponent,
    updateStore,
    sendChannelUpdatedNotification,
    assignChannelId,
    displayUi,
    hideUi
  };
  const options = {
    services,
    actions,
    guards
  };
  return Machine(config).withConfig(options, context);
};

const mockServices = {
  invokeCreateMachine: () => {},
  invokeJoinMachine: () => {},
  invokeClosingMachine: () => {}
};
const mockActions = {
  sendToOpponent: () => {},
  updateStore: () => {},
  sendChannelUpdatedNotification: () => {},
  hideUi: () => {},
  displayUi: () => {},
  assignChannelId: () => {}
};
const mockGuards = {channelOpen: () => true, channelClosing: () => true};
export const mockOptions = {services: mockServices, actions: mockActions, guards: mockGuards};
