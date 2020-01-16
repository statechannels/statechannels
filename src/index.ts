import {handleMessage, sendMessage, dispatchChannelUpdatedMessage} from './messaging';
import {Wallet} from '@statechannels/wallet-protocols/lib/src/protocols';
import {IStore} from '@statechannels/wallet-protocols/lib/src/store';
import {ethers} from 'ethers';
import {Store} from './storage/store';
import {interpret} from 'xstate';

const ourWallet = ethers.Wallet.createRandom();
const store: IStore = new Store({
  privateKeys: {
    [ourWallet.address]: ourWallet.privateKey
  },
  messageSender: sendMessage,
  channelUpdateListener: dispatchChannelUpdatedMessage
});
function logState(actor, level = 0) {
  if (actor.state) {
    console.log(`${' '.repeat(level)}${JSON.stringify(actor.state.value)}`);
    Object.values(actor.state.children).map(child => {
      logState(child, level + 2);
    });
  }
}
const logProcessStates = state => {
  console.log(`WALLET: ${state.context.id}`);
  state.context.processes.forEach(p => {
    console.log(`  PROCESS: ${p.id}`);
    Object.values(p.ref.state.children).map(child => {
      logState(child, 4);
    });
  });
};

const walletMachine = interpret<Wallet.Init, any, Wallet.Events>(
  Wallet.machine(store, {processes: [], id: 'wallet'})
)
  .onTransition(logProcessStates)

  .start();

window.addEventListener('message', async event => {
  await handleMessage(event, walletMachine, store, ourWallet);
});
