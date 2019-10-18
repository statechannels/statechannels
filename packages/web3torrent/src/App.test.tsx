import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3torrent, WebTorrentContext} from './clients/web3torrent-client';

it('renders app without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(
    <WebTorrentContext.Provider value={web3torrent}>
      <App />
    </WebTorrentContext.Provider>,
    div
  );
  ReactDOM.unmountComponentAtNode(div);
});
