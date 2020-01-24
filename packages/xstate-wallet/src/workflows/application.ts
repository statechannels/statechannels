import {MachineConfig, Machine, StateMachine, send} from 'xstate';
import {FINAL, MachineFactory} from '@statechannels/wallet-protocols';
import {
  CreateChannelEvent,
  OpenChannelEvent
} from '@statechannels/wallet-protocols/src/protocols/wallet/protocol';
import {CreateChannel, JoinChannel} from '@statechannels/wallet-protocols/lib/src/protocols';
import {IStore} from '@statechannels/wallet-protocols/src/store';
import {State, getChannelId} from '@statechannels/nitro-protocol';
import {SendStates} from '@statechannels/wallet-protocols/src/wire-protocol';
import {sendDisplayMessage} from '../messaging';

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
  on: {SendStates: {actions: ['updateStore', 'sendChannelUpdated']}}
};
const running = {
  on: {
    PLAYER_STATE_UPDATE: {target: 'running', actions: ['sendToOpponent']},
    SendStates: {target: 'running', actions: ['updateStore', 'sendChannelUpdated']}
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
  const sendChannelUpdated = send((context, event: any) => {
    const channelId = getChannelId(event.signedStates[0].state.channel);
    return {
      type: 'CHANNEL_UPDATED',
      channelId
    };
  });
  const displayUi = (context, event) => {
    sendDisplayMessage('Show');
  };
  const hideUi = (context, event) => {
    sendDisplayMessage('Hide');
  };
  const actions = {sendToOpponent, updateStore, sendChannelUpdated, hideUi, displayUi};
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
  sendChannelUpdated: () => {},
  hideUi: () => {},
  displayUi: () => {}
};
export const mockOptions = {services: mockServices, actions: mockActions};
