import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3torrent, Web3TorrentContext} from './clients/web3torrent-client';
import {GlobalProvider} from './contexts/global-context';

ReactDOM.render(
  <GlobalProvider>
    <Web3TorrentContext.Provider value={web3torrent}>
      <App />
    </Web3TorrentContext.Provider>
  </GlobalProvider>,
  document.getElementById('root')
);
