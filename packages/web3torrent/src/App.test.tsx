import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3torrent, Web3TorrentContext} from './clients/web3torrent-client';
afterAll(() => {
  web3torrent.destroy();
});

it('renders app without crashing', () => {
  const div = document.createElement('div');

  ReactDOM.render(
    <Web3TorrentContext.Provider value={web3torrent}>
      <App />
    </Web3TorrentContext.Provider>,
    div
  );

  ReactDOM.unmountComponentAtNode(div);
});
