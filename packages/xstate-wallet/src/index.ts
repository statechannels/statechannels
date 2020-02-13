import {ethers} from 'ethers';

// TODO import {ChainWatcher} from './chain';
import {MemoryStore} from './store/memory-store';

import {ChannelWallet} from './channel-wallet';

const ethWallet = ethers.Wallet.createRandom();
const store = new MemoryStore([ethWallet.privateKey]);
const channelWallet = new ChannelWallet(store);

// Communicate via postMessage
window.addEventListener('message', async event => {
  channelWallet.pushMessage(event.data);
});
channelWallet.onSendMessage(m => window.parent.postMessage(m, '*'));
