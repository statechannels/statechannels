import {ChannelWallet} from './channel-wallet';
import {MessagingService} from './messaging';
import {ChainWatcher} from './chain';
import {MemoryBackend} from './store/memory-backend';
import {XstateStore} from './store';
import * as constants from './constants';
import Url from 'url-parse';
import './render';

import {logger} from './logger';
import {Backend} from './store/dexie-backend';
const log = logger.info.bind(logger);

(async function() {
  const chain = new ChainWatcher();

  const backend = constants.USE_INDEXED_DB ? new Backend() : new MemoryBackend();
  const store = new XstateStore(chain, backend);

  await store.initialize([], constants.CLEAR_STORAGE_ON_START);
  const messagingService = new MessagingService(store);
  const channelWallet = new ChannelWallet(store, messagingService);

  // Communicate via postMessage
  window.addEventListener('message', event => {
    if (event.data && event.data.jsonrpc && event.data.jsonrpc === '2.0') {
      constants.ADD_LOGS && log({jsonRpcRequest: event.data}, 'INCOMING JSONRPC REQUEST:');
      const {host} = new Url(event.origin);
      channelWallet.pushMessage(event.data, host);
    }
  });
  channelWallet.onSendMessage(message => {
    window.parent.postMessage(message, '*');
    constants.ADD_LOGS && log({jsonRpcResponse: message}, 'OUTGOING JSONRPC REQUEST:');
  });

  window.parent.postMessage('WalletReady', '*');
})();
