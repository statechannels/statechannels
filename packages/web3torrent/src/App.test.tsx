import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3torrent, WebTorrentContext} from './clients/web3torrent-client';

it('renders app without crashing', () => {
  async function on() {
    return new Promise(r => r());
  }

  const ethereum = {
    on
  };

  // mock out window.ethereum.enable
  Object.defineProperty(window, 'ethereum', {
    enumerable: true,
    value: ethereum
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
