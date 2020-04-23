import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3torrent, Web3TorrentContext} from './clients/web3torrent-client';
import {OmniProvider} from './contexts/omni-provider';

ReactDOM.render(
  <OmniProvider>
    <Web3TorrentContext.Provider value={web3torrent}>
      <App />
    </Web3TorrentContext.Provider>
  </OmniProvider>,
  document.getElementById('root')
);
