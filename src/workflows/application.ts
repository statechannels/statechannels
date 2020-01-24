import {MachineConfig, Machine, StateMachine, assign} from 'xstate';
import {
  FINAL,
  MachineFactory,
  CreateChannelEvent,
  OpenChannelEvent,
  CreateChannel,
  JoinChannel,
  ConcludeChannel,
  IStore,
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
const initializing = {on: {CREATE_CHANNEL: 'funding', OPEN_CHANNEL: 'funding'}};

const funding = {
  entry: ['displayUi'],
  invoke: {
    id: 'openMachine',
    src: 'invokeOpeningMachine',
    data: (context, event) => event,
    onDone: {target: 'running', actions: ['hideUi']},
    autoForward: true
  },
  on: {
    SendStates: {actions: ['updateStore', 'sendChannelUpdated']},
    // TODO: This is temporary until we split opening into joining/creating
    CHANNEL_UPDATED: {actions: 'assignChannelId'}
  }
};
const running = {
  on: {
    PLAYER_STATE_UPDATE: {target: 'running', actions: ['sendToOpponent']},
    CHANNEL_UPDATED: {target: 'running', actions: 'sendChannelUpdatedNotification'},
    SendStates: [
      {cond: 'channelOpen', target: 'running', actions: ['updateStore', 'sendChannelUpdated']},
      {cond: 'channelClosing', target: 'closing', actions: ['updateStore', 'sendChannelUpdated']}
    ],
    PLAYER_REQUEST_CONCLUDE: {target: 'closing'}
  }
};
const closing = {
  invoke: {
    id: 'closingMachine',
    src: 'invokeClosingMachine',
    data: (context, event) => context,
    autoForward: true,
    onDone: 'done'
  },
  on: {SendStates: {actions: ['updateStore', 'sendChannelUpdated']}},
  onDone: 'done'
};
const done = {type: FINAL};

export const config: MachineConfig<any, any, any> = {
  initial: 'initializing',
  states: {initializing, funding, running, closing, done}
};

export const applicationWorkflow: MachineFactory<ApplicationContext, any> = (
  store: IStore,
  context: ApplicationContext
) => {
  const invokeOpeningMachine = (context, event: OpenEvent): StateMachine<any, any, any, any> => {
    if (event.type === 'CREATE_CHANNEL') {
      return CreateChannel.machine(store);
    } else {
      return JoinChannel.machine(store, event);
    }
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
  const sendChannelUpdated = (context, event: ChannelUpdated) => {
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

  const channelOpen = (context: ApplicationContext, event: SendStates): boolean => {
    return !channelClosing(context, event);
  };
  const channelClosing = (context: ApplicationContext, event: SendStates): boolean => {
    return event.signedStates
      .filter(ss => context.channelId === getChannelId(ss.state.channel))
      .some(ss => ss.state.isFinal);
  };

  const assignChannelId = assign({
    channelId: (
      context: ApplicationContext,
      event: ChannelUpdated | SendStates | PlayerStateUpdate
    ) => {
      if (!context.channelId) {
        if (event.type === 'CHANNEL_UPDATED') {
          return event.channelId;
        } else if (event.type === 'PLAYER_STATE_UPDATE') {
          return getChannelId(event.state.channel);
        } else {
          return getChannelId(event.signedStates[0].state.channel);
        }
      }
      return context.channelId;
    }
  });

  const guards = {channelOpen, channelClosing};
  const services = {invokeClosingMachine, invokeOpeningMachine};
  const actions = {
    sendToOpponent,
    updateStore,
    sendChannelUpdated,
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

const mockServices = {invokeOpeningMachine: () => {}, invokeClosingMachine: () => {}};
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
