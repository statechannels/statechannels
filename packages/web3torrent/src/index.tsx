import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/browser';
import App from './App';

import {VERSION} from './constants';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: 'https://d8f6fb84518e4abe97a63dbb28b7cb27@o344922.ingest.sentry.io/5228838',
    release: 'web3torrent@' + VERSION
  });
}

import Drift from 'react-driftjs';

import {web3torrent, Web3TorrentContext} from './clients/web3torrent-client';

ReactDOM.render(
  <Web3TorrentContext.Provider value={web3torrent}>
    <App />
    {process.env.DRIFT_CHATBOX_APP_ID && <Drift appId={process.env.DRIFT_CHATBOX_APP_ID} />}
  </Web3TorrentContext.Provider>,
  document.getElementById('root')
);
