import {handleMessage, sendMessage, dispatchChannelUpdatedMessage} from './messaging';

import {IStore} from '@statechannels/wallet-protocols/lib/src/store';
import {ethers} from 'ethers';
import {Store} from './storage/store';
import {ChainWatcher} from './chain';
import {WorkflowManager} from './workflow-manager';
import ReactDOM from 'react-dom';
import React from 'react';
import WalletUi from './ui/wallet';

const ourWallet = ethers.Wallet.createRandom();

const chain = new ChainWatcher();

const store: IStore = new Store({
  chain,
  privateKeys: {
    [ourWallet.address]: ourWallet.privateKey
  },
  messageSender: sendMessage,
  channelUpdateListener: dispatchChannelUpdatedMessage
});
const workflowManager = new WorkflowManager(store);

window.addEventListener('message', async event => {
  await handleMessage(event, workflowManager, store, ourWallet);
});

(window as any).React2 = React;
console.log((window as any).React1 === (window as any).React2);
