// TODO: Replace with injection via other means than direct app import
// NOTE: This adds `channelProvider` to the `Window` object
import '@statechannels/channel-provider';

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3torrent, WebTorrentContext} from './clients/web3torrent-client';

// TODO: Put inside better place than here where app can handle error case
console.info(`enabling window.channelProvider with ${process.env.REACT_APP_WALLET_URL}`);
window.channelProvider.enable(process.env.REACT_APP_WALLET_URL);

ReactDOM.render(
  <WebTorrentContext.Provider value={web3torrent}>
    <App />
  </WebTorrentContext.Provider>,
  document.getElementById('root')
);
