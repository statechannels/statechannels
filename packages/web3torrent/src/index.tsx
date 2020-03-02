import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3torrent, WebTorrentContext} from './clients/web3torrent-client';
import {web3TorrentChannelClient, ChannelContext} from './clients/web3t-channel-client';

ReactDOM.render(
  <ChannelContext.Provider value={web3TorrentChannelClient}>
    <WebTorrentContext.Provider value={web3torrent}>
      <App />
    </WebTorrentContext.Provider>
  </ChannelContext.Provider>,
  document.getElementById('root')
);
