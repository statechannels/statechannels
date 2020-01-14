import { interpret } from 'xstate';
import { pretty } from '.';
import { messageService } from './messaging';
import { createChannel } from './mock-messages';
import { Wallet } from './protocols';
import { Store } from './store';
import { AddressableMessage } from './wire-protocol';
import { ethers } from 'ethers';

const store = (wallet: ethers.Wallet) => {
  const privateKeys = { [wallet.address]: wallet.privateKey };
  const _store = new Store({ privateKeys });

  return _store;
};

const one = '0x0000000000000000000000000000000000000000000000000000000000000001';
const two = '0x0000000000000000000000000000000000000000000000000000000000000002';
const first = new ethers.Wallet(one);
const second = new ethers.Wallet(two);
const stores = {
  [first.address]: store(first),
  [second.address]: store(second),
};

const logEvents = name =>
  process.env.ADD_LOGS
    ? event =>
        console.log(
          pretty({
            EVENT_LOGGED: {
              wallet: name,
              event: event.type,
            },
          })
        )
    : () => {};
const logStore = name =>
  process.env.ADD_LOGS
    ? state => console.log(`${name}'s store: ${pretty(stores[name])}`)
    : () => {};
const wallet = (wallet): any => {
  const machine = Wallet.machine(stores[wallet.address], { processes: [], id: wallet.address });
  return interpret<Wallet.Init, any, Wallet.Events>(machine)
    .onEvent(logEvents(wallet.address))
    .onTransition(logStore(wallet.address))
    .start();
};

const wallets = {
  [first.address]: wallet(first),
  [second.address]: wallet(second),
};

// This is sort of the "dispatcher"
messageService.on('message', ({ to, ...event }: AddressableMessage) => {
  wallets[to].send(event);
});

wallets[first.address].send(createChannel);
