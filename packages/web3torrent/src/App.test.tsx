import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3torrent, WebTorrentContext} from './clients/web3torrent-client';
import {FakeChannelProvider} from '@statechannels/channel-client';

it('renders app without crashing', () => {
  // mock out window.channelProvider
  Object.defineProperty(window, 'channelProvider', {
    enumerable: true,
    value: new FakeChannelProvider()
  });

  const div = document.createElement('div');

  ReactDOM.render(
    <WebTorrentContext.Provider value={web3torrent}>
      <App />
    </WebTorrentContext.Provider>,
    div
  );

  ReactDOM.unmountComponentAtNode(div);
});
