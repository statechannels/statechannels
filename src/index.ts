import {handleMessage} from './messaging';

import {ethers} from 'ethers';

// TODO import {ChainWatcher} from './chain';
import {WorkflowManager} from './workflow-manager';
import {MemoryStore, Store} from './store/memory-store';

const ourWallet = ethers.Wallet.createRandom();

const store: Store = new MemoryStore([ourWallet.privateKey]);

const workflowManager = new WorkflowManager(store);

window.addEventListener('message', async event => {
  await handleMessage(event, workflowManager, store, ourWallet);
});
