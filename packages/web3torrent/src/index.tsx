import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3torrent, Web3TorrentContext} from './clients/web3torrent-client';

ReactDOM.render(
  <Web3TorrentContext.Provider value={web3torrent}>
    <App />
  </Web3TorrentContext.Provider>,
  document.getElementById('root')
);
