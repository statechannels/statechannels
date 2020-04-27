import React from 'react';
import ReactDOM from 'react-dom';
import Drift from 'react-driftjs';

import App from './App';
import {web3torrent, Web3TorrentContext} from './clients/web3torrent-client';

ReactDOM.render(
  <Web3TorrentContext.Provider value={web3torrent}>
    <App />
    {process.env.REACT_APP_INCLUDE_DRIFT_CHATBOX && <Drift appId="kp3gf29uk9c3" />}
  </Web3TorrentContext.Provider>,
  document.getElementById('root')
);
