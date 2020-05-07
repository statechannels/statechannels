import React from 'react';
import ReactDOM from 'react-dom';
import Drift from 'react-driftjs';

import App from './App';
import {web3torrent, Web3TorrentContext} from './clients/web3torrent-client';

ReactDOM.render(
  <Web3TorrentContext.Provider value={web3torrent}>
    <App />
    {process.env.REACT_APP_DRIFT_CHATBOX_APP_ID && (
      <Drift appId={process.env.REACT_APP_DRIFT_CHATBOX_APP_ID} />
    )}
  </Web3TorrentContext.Provider>,
  document.getElementById('root')
);
