import * as Sentry from '@sentry/browser';
import Url from 'url-parse';
import ReactDOM from 'react-dom';
import {isRequest} from '@statechannels/client-api-schema';

import {Backend} from './store/dexie-backend';
import {Store} from './store';
import {MemoryBackend} from './store/memory-backend';
import {ChainWatcher} from './chain';
import {logger} from './logger';
import {CLEAR_STORAGE_ON_START, USE_INDEXED_DB, ADD_LOGS, NODE_ENV, GIT_VERSION} from './config';
import {MessagingService} from './messaging';
import {ChannelWallet} from './channel-wallet';
import App from './ui/app';

if (NODE_ENV === 'production') {
  Sentry.init({
    dsn: 'https://8706e073ecb646a6b7589c87f0468652@o344922.ingest.sentry.io/5236239',
    release: 'xstate-wallet@' + GIT_VERSION
  });
}

const log = logger.trace.bind(logger);

(async function() {
  log({version: GIT_VERSION}, 'Wallet initializing');

  const chain = new ChainWatcher();

  const backend = USE_INDEXED_DB ? new Backend() : new MemoryBackend();
  const store = new Store(chain, backend);

  await store.initialize([], CLEAR_STORAGE_ON_START);
  const messagingService = new MessagingService(store);
  const channelWallet = new ChannelWallet(store, messagingService);

  if (NODE_ENV === 'production') {
    Sentry.configureScope(async scope => {
      scope.setUser({id: await store.getAddress()});
    });
  }

  // Communicate via postMessage
  window.addEventListener('message', event => {
    if (isRequest(event.data)) {
      ADD_LOGS && log({jsonRpcRequest: event.data}, 'INCOMING JSONRPC REQUEST:');
      const {host} = new Url(event.origin);
      channelWallet.pushMessage(event.data, host);
    }
  });
  channelWallet.onSendMessage(message => {
    window.parent.postMessage(message, '*');
    ADD_LOGS && log({jsonRpcResponse: message}, 'OUTGOING JSONRPC REQUEST:');
  });

  window.parent.postMessage('WalletReady', '*');

  ReactDOM.render(App({wallet: channelWallet}), document.getElementById('root'));
})();
