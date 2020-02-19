import {FakeChannelProvider} from '@statechannels/channel-client';

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3torrent, WebTorrentContext} from './clients/web3torrent-client';

if (process.env.REACT_APP_FAKE_CHANNEL_PROVIDER === 'true') {
  window.channelProvider = new FakeChannelProvider();
} else {
  // TODO: Replace with injection via other means than direct app import
  // NOTE: This adds `channelProvider` to the `Window` object
  require('@statechannels/channel-provider');
}

// TODO: Put inside better place than here where app can handle error case
window.channelProvider.enable(process.env.REACT_APP_WALLET_URL);

ReactDOM.render(
  <WebTorrentContext.Provider value={web3torrent}>
    <App />
  </WebTorrentContext.Provider>,
  document.getElementById('root')
);
