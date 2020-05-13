import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3TorrentClient, Web3TorrentClientContext} from './clients/web3torrent-client';
afterAll(() => {
  web3TorrentClient.destroy();
});

it('renders app without crashing', () => {
  const div = document.createElement('div');

  ReactDOM.render(
    <Web3TorrentClientContext.Provider value={web3TorrentClient}>
      <App />
    </Web3TorrentClientContext.Provider>,
    div
  );

  ReactDOM.unmountComponentAtNode(div);
});
