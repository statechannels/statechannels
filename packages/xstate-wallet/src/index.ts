import {handleMessage, sendMessage} from './messaging';

import {Store, EphemeralStore} from '@statechannels/wallet-protocols/';
import {ethers} from 'ethers';

import {ChainWatcher} from './chain';
import {WorkflowManager} from './workflow-manager';
import {ETH_ASSET_HOLDER_ADDRESS} from './constants';

const ourWallet = ethers.Wallet.createRandom();

const chain = new ChainWatcher();

const store: Store = new EphemeralStore({
  chain,
  privateKeys: {
    [ourWallet.address]: ourWallet.privateKey
  },
  messagingService: {sendMessage},
  ethAssetHolderAddress: ETH_ASSET_HOLDER_ADDRESS
});

const workflowManager = new WorkflowManager(store);

window.addEventListener('message', async event => {
  await handleMessage(event, workflowManager, store, ourWallet);
});
