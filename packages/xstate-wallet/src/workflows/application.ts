import {MachineConfig, Machine, StateMachine} from 'xstate';
import {
  FINAL,
  MachineFactory,
  CreateChannelEvent,
  OpenChannelEvent,
  CreateChannel,
  JoinChannel,
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

export type ApplicationWorkflowEvent = PlayerStateUpdate | SendStates | OpenEvent;

// Context
interface ApplicationContext {
  channelId: string;
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
    SendStates: {actions: ['updateStore']},
    CHANNEL_UPDATED: {actions: 'sendChannelUpdatedNotification'}
  }
};
const running = {
  on: {
    PLAYER_STATE_UPDATE: {target: 'running', actions: ['sendToOpponent']},
    SendStates: {target: 'running', actions: ['updateStore']},
    CHANNEL_UPDATED: {target: 'running', actions: 'sendChannelUpdatedNotification'}
  }
};
const closing = {};
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
  const actions = {sendToOpponent, updateStore, sendChannelUpdatedNotification, hideUi, displayUi};
  const options = {
    services: {invokeOpeningMachine},
    actions
  };
  return Machine(config).withConfig(options, context);
};

const mockServices = {invokeOpeningMachine: () => {}};
const mockActions = {
  sendToOpponent: () => {},
  updateStore: () => {},
  sendChannelUpdatedNotification: () => {},
  hideUi: () => {},
  displayUi: () => {}
};
export const mockOptions = {services: mockServices, actions: mockActions};
