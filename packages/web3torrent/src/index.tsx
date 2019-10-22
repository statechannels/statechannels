import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';
import {web3torrent, WebTorrentContext} from './clients/web3torrent-client';

ReactDOM.render(
  <WebTorrentContext.Provider value={web3torrent}>
    <App />
  </WebTorrentContext.Provider>,
  document.getElementById('root')
);
