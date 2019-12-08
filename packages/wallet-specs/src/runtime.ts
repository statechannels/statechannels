import { AnyEventObject, interpret, Interpreter } from 'xstate';
import { getChannelID, pretty } from '.';
import { messageService } from './messaging';
import { Wallet } from './protocols';
import { AddressableMessage } from './wire-protocol';

import { CreateChannelEvent } from './protocols/wallet/protocol';
import { Store } from './store';

const store = name => {
  const privateKeys = { [name]: name };
  const _store = new Store({ privateKeys });
  messageService.on('message', (m: AddressableMessage) => {
    if (m.to === name) {
      switch (m.type) {
        case 'SendStates':
          _store.receiveStates(m.signedStates);
      }
    }
  });

  return _store;
};

const first = 'first';
const second = 'second';
const stores = {
  first: store(first),
  second: store(second),
};

const logEvents = name => event =>
  console.log(`EVENT: ${name}: ${event.type}`);
const logStore = name => state =>
  console.log(`${name}'s store: ${pretty(stores[name])}`);
const wallet = name => {
  return interpret(Wallet.machine(stores[name]).withContext({ processes: [], id: name}))
    .onEvent(logEvents(name))
    .start();
};

const wallets: Record<string, Interpreter<Wallet.Init, any, AnyEventObject>> = {
  first: wallet(first),
  second: wallet(second),
};

// This is sort of the "dispatcher"
messageService.on('message', ({ to, ...event }: AddressableMessage) => {
  switch (event.type) {
    case 'SendStates': {
      stores[to].receiveStates(event.signedStates);
      const channelId = getChannelID(event.signedStates[0].state.channel);

      wallets[to].send({
        type: 'CHANNEL_UPDATED',
        channelId,
      });
      break;
    }
    case 'OPEN_CHANNEL': {
      wallets[to].send(event);
      break;
    }
  }
});

const createChannel: CreateChannelEvent = {
  type: 'CREATE_CHANNEL',
  participants: [
    {
      participantId: first,
      signingAddress: first,
      destination: first,
    },
    {
      participantId: second,
      signingAddress: second,
      destination: second,
    },
  ],
  allocations: [
    { destination: first, amount: '3' },
    { destination: second, amount: '1' },
  ],
  appDefinition: '0x',
  appData: '0x',
};

wallets[first].send(createChannel);
