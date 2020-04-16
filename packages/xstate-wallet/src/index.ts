import {ChannelWallet} from './channel-wallet';
import {MessagingService} from './messaging';
import {ChainWatcher} from './chain';
import {IndexedDBBackend} from './store/indexedDB-backend';
import {MemoryBackend} from './store/memory-backend';
import {XstateStore} from './store';
import * as constants from './constants';
import Url from 'url-parse';

(async function() {
  const chain = new ChainWatcher();

  const backend = constants.USE_INDEXED_DB ? new IndexedDBBackend() : new MemoryBackend();
  const store = new XstateStore(chain, backend);

  await store.initialize([], constants.CLEAR_STORAGE_ON_START);
  const messagingService = new MessagingService(store);
  const channelWallet = new ChannelWallet(store, messagingService);

  // Communicate via postMessage
  window.addEventListener('message', event => {
    if (event.data && event.data.jsonrpc && event.data.jsonrpc === '2.0') {
      constants.ADD_LOGS &&
        console.log(`INCOMING JSONRPC REQUEST: ${JSON.stringify(event.data, null, 1)}`);
      const {host} = new Url(event.origin);
      channelWallet.pushMessage(event.data, host);
    }
  });
  channelWallet.onSendMessage(m => {
    window.parent.postMessage(m, '*');
    constants.ADD_LOGS && console.log(`OUTGOING JSONRPC MESSAGE: ${JSON.stringify(m, null, 1)}`);
  });

  window.parent.postMessage('WalletReady', '*');
})();

import './render';
