import {MachineConfig, Machine, StateMachine} from 'xstate';
import {FINAL, MachineFactory} from '@statechannels/wallet-protocols';
import {
  CreateChannelEvent,
  OpenChannelEvent
} from '@statechannels/wallet-protocols/src/protocols/wallet/protocol';
import {CreateChannel, JoinChannel} from '@statechannels/wallet-protocols/lib/src/protocols';
import {IStore} from '@statechannels/wallet-protocols/src/store';
type OpenEvent = CreateChannelEvent | OpenChannelEvent;

interface ApplicationContext {
  channelId: string;
}

// The application protocol is responsible for running a channel for an application
// Initially it will be based on RPS have follow this roughly: ChannelInit->Funding->Running->ChannelClosed

// States
const initializing = {on: {CREATE_CHANNEL: 'funding', OPEN_CHANNEL: 'funding'}};
const funding = {
  invoke: {
    src: 'invokeOpeningMachine',
    data: (context, event) => event,
    onDone: 'running',
    autoForward: true
  }
};
const running = {};
const closing = {};
const done = {type: FINAL};

const config: MachineConfig<any, any, any> = {
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
  const options = {
    services: {invokeOpeningMachine}
  };
  return Machine(config).withConfig(options, context);
};
