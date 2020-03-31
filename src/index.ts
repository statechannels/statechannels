import {ethers} from 'ethers';

import {ChannelWallet} from './channel-wallet';
import {MessagingService} from './messaging';
import {ChainWatcher} from './chain';
import {IndexedDBBackend} from './store/indexedDB-backend';
import {MemoryBackend} from './store/memory-backend';
import {XstateStore} from './store';
import * as constants from './constants';
import extractDomain from 'extract-domain';

(async function() {
  const {privateKey} = ethers.Wallet.createRandom();
  const chain = new ChainWatcher();

  const backend = constants.USE_INDEXED_DB ? new IndexedDBBackend() : new MemoryBackend();
  const store = new XstateStore(chain, backend);

  await store.initialize([privateKey], constants.CLEAR_STORAGE_ON_START);
  const messagingService = new MessagingService(store);
  const channelWallet = new ChannelWallet(store, messagingService);

  // Communicate via postMessage
  window.addEventListener('message', event => {
    if (event.data && event.data.jsonrpc && event.data.jsonrpc === '2.0') {
      process.env.ADD_LOGS &&
        console.log(`INCOMING JSONRPC REQUEST: ${JSON.stringify(event.data, null, 1)}`);
      channelWallet.pushMessage(event.data, extractDomain(event.origin));
    }
  });
  channelWallet.onSendMessage(m => {
    window.parent.postMessage(m, '*');
    process.env.ADD_LOGS && console.log(`OUTGOING JSONRPC MESSAGE: ${JSON.stringify(m, null, 1)}`);
  });

  window.parent.postMessage('WalletReady', '*');
})();
