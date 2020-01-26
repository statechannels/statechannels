import {handleMessage, sendMessage} from './messaging';

import {IStore, Store} from '@statechannels/wallet-protocols/';
import {ethers} from 'ethers';

import {ChainWatcher} from './chain';
import {WorkflowManager} from './workflow-manager';

const ourWallet = ethers.Wallet.createRandom();

const chain = new ChainWatcher();

const store: IStore = new Store({
  chain,
  privateKeys: {
    [ourWallet.address]: ourWallet.privateKey
  },
  messagingService: {sendMessage}
});

const workflowManager = new WorkflowManager(store);

window.addEventListener('message', async event => {
  await handleMessage(event, workflowManager, store, ourWallet);
});
