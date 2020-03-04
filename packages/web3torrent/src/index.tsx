import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3torrent, WebTorrentContext} from './clients/web3torrent-client';
import {paymentChannelClient, ChannelContext} from './clients/payment-channel-client';

ReactDOM.render(
  <ChannelContext.Provider value={paymentChannelClient}>
    <WebTorrentContext.Provider value={web3torrent}>
      <App />
    </WebTorrentContext.Provider>
  </ChannelContext.Provider>,
  document.getElementById('root')
);
