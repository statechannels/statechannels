import {handleMessage, sendMessage, dispatchChannelUpdatedMessage} from './messaging';

import {IStore} from '@statechannels/wallet-protocols/lib/src/store';
import {ethers} from 'ethers';
import {Store} from './storage/store';
import {interpret, Interpreter, Actor} from 'xstate';
import {ChainWatcher} from './chain';
import {CreateChannelEvent} from '@statechannels/wallet-protocols/src/protocols/wallet/protocol';
import {OpenChannelEvent} from '@statechannels/wallet-protocols/lib/src/protocols/wallet/protocol';
import {applicationWorkflow} from './workflows/application.workflow';
import {getChannelId} from '@statechannels/wallet-protocols';
import {ChannelUpdated} from '@statechannels/wallet-protocols/src/store';
import {WorkflowManager} from './workflow-manager';

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
