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

const walletMachine = interpret<Wallet.Init, any, Wallet.Events>(
  Wallet.machine(store, {processes: [], id: 'wallet'})
)
  .onTransition(console.log)
  .onEvent(console.log)
  .start();

window.addEventListener('message', async event => {
  await handleMessage(event, walletMachine, store, ourWallet);
});
