import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/browser';
import App from './App';
import {isMobile} from 'react-device-detect';
import {VERSION} from './constants';
import {Flash} from 'rimble-ui';
import {logger} from './logger';
import {UAParser} from 'ua-parser-js';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: 'https://d8f6fb84518e4abe97a63dbb28b7cb27@o344922.ingest.sentry.io/5228838',
    release: 'web3torrent@' + VERSION
  });
}

import {web3TorrentClient, Web3TorrentClientContext} from './clients/web3torrent-client';

const log = logger.child({module: 'index'});
log.info(new UAParser().getResult(), 'Device info');

if (isMobile) {
  ReactDOM.render(
    <Flash my={3} variant="danger">
      Sorry Web3Torrent currently does not support mobile devices.
    </Flash>,
    document.getElementById('root')
  );
} else {
  ReactDOM.render(
    <Web3TorrentClientContext.Provider value={web3TorrentClient}>
      <App />
    </Web3TorrentClientContext.Provider>,
    document.getElementById('root')
  );
}
