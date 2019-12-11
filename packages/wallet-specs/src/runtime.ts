import { AnyEventObject, interpret, Interpreter } from 'xstate';
import { pretty } from '.';
import { messageService } from './messaging';
import { createChannel } from './mock-messages';
import { Wallet } from './protocols';
import { Process } from './protocols/wallet/protocol';
import { Store } from './store';
import { AddressableMessage } from './wire-protocol';

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

const logEvents = name => event => {
  console.log(
    pretty({
      EVENT_LOGGED: {
        wallet: name,
        event: event.type,
      },
    })
  );
};
const logStore = name => state =>
  console.log(`${name}'s store: ${pretty(stores[name])}`);
const wallet = (name: string) => {
  const machine = Wallet.machine(stores[name], { processes: [], id: name });
  return interpret<Wallet.Init, any, Wallet.Events>(machine)
    .onEvent(logEvents(name))
    .onTransition(logStore(name))
    .start();
};

const wallets = {
  first: wallet(first),
  second: wallet(second),
};

// This is sort of the "dispatcher"
messageService.on('message', ({ to, ...event }: AddressableMessage) => {
  wallets[to].send(event);
});

wallets[first].send(createChannel);
