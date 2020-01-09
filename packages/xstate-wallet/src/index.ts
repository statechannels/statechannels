import {handleMessage} from './messaging';
import {Wallet} from '@statechannels/wallet-protocols/lib/src/protocols';
import {IStore} from '@statechannels/wallet-protocols/lib/src/store';
import {ethers} from 'ethers';
import {Store} from './storage/store';
import {interpret} from 'xstate';
import ReactDOM from 'react-dom';
import WalletUi from './ui/Wallet';
import React from 'react';
import {ProcessManager} from './process-manager';

const ourWallet = ethers.Wallet.createRandom();
const store: IStore = new Store({privateKeys: {[ourWallet.address]: ourWallet.privateKey}});

const walletMachine = interpret<Wallet.Init, any, Wallet.Events>(
  Wallet.machine(store, {processes: [], id: 'wallet'})
)
  .onTransition(console.log)
  .onEvent(console.log)
  .start();

const processManager = new ProcessManager(walletMachine);

window.addEventListener('message', async event => {
  await handleMessage(event, walletMachine, store, ourWallet, processManager);
});

walletMachine.onChange(() => {
  ReactDOM.render(
    React.createElement(WalletUi, {
      currentProcess: processManager.currentProcessName || '',
      currentState: processManager.currentProcessMachine?.state
    }),
    document.getElementById('root')
  );
});
