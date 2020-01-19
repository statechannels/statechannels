import { interpret, Actor } from 'xstate';
import { pretty } from '.';
import { messageService } from './messaging';
import { createChannel } from './mock-messages';
import { Wallet } from './protocols';
import { Store } from './store';
import { AddressableMessage } from './wire-protocol';
import { ethers } from 'ethers';
import { Process } from './protocols/wallet/protocol';

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
  process.env.ADD_LOGS ? state => console.log(`${pretty(stores[name])}`) : () => {};

export function logState(actor: Actor, level = 0) {
  if (actor.state) {
    console.log(`${' '.repeat(level)}${JSON.stringify(actor.state.value)}`);
    Object.values(actor.state.children).map((child: Actor) => {
      logState(child, level + 2);
    });
  }
}

export const logProcessStates = process.env.ADD_LOGS
  ? state => {
      console.log(`WALLET: ${state.context.id}`);
      state.context.processes.forEach((p: Process) => {
        console.log(`  PROCESS: ${p.id}`);
        Object.values(p.ref.state.children).map(child => {
          logState(child, 4);
        });
      });
    }
  : () => {};

const wallet = (wallet): any => {
  const machine = Wallet.machine(stores[wallet.address], { processes: [], id: wallet.address });
  return interpret<Wallet.Init, any, Wallet.Events>(machine)
    .onEvent(logEvents(wallet.address))
    .onTransition(logProcessStates)
    .start();
};

export async function runtime() {
  const wallets = {
    [first.address]: wallet(first),
    [second.address]: wallet(second),
  };

  // This is sort of the "dispatcher"
  messageService.on('message', ({ to, ...event }: AddressableMessage) => {
    wallets[to].send(event);
  });

  await wallets[first.address].send(createChannel);

  return wallets;
}

// If you want to debug, uncomment the following
// runtime().then(wallets => { debugger; });
