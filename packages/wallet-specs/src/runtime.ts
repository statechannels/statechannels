import { AnyEventObject, interpret, Interpreter } from 'xstate';
import { pretty } from '.';
import { messageService } from './messaging';
import { Wallet } from './protocols';
import { AddressableMessage } from './wire-protocol';

import { CreateChannelEvent } from './protocols/wallet/protocol';
import { Store } from './store';

const store = name => {
  const privateKeys = { [name]: name };
  const _store = new Store({ privateKeys });

  return _store;
};

const first = 'first';
const second = 'second';
const stores = {
  first: store(first),
  second: store(second),
};

const logEvents = name => event =>
  console.log(
    pretty({
      EVENT_LOGGED: {
        wallet: name,
        event: event.type,
      },
    })
  );
const logStore = name => state =>
  console.log(`${name}'s store: ${pretty(stores[name])}`);
const wallet = name => {
  return interpret(
    Wallet.machine(stores[name]).withContext({ processes: [], id: name })
  )
    .onEvent(logEvents(name))
    .start();
};

const wallets: Record<string, Interpreter<Wallet.Init, any, AnyEventObject>> = {
  first: wallet(first),
  second: wallet(second),
};

// This is sort of the "dispatcher"
messageService.on('message', ({ to, ...event }: AddressableMessage) => {
  wallets[to].send(event);
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
