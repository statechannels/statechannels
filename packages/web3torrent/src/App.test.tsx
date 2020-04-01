import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {web3torrent, WebTorrentContext} from './clients/web3torrent-client';

// This tests fails with the following error message
// /Users/georgeknee/statechannels/monorepo/node_modules/webtorrent/lib/torrent.js:232
//
// if (this._rechokeIntervalId.unref) this._rechokeIntervalId.unref()
// ^
//
// TypeError: Cannot read property 'unref' of undefined
// at Torrent._onParsedTorrent (/Users/georgeknee/statechannels/monorepo/node_modules/webtorrent/lib/torrent.js:232:33)
// at process.nextTick (/Users/georgeknee/statechannels/monorepo/node_modules/webtorrent/lib/torrent.js:205:14)
// at process._tickCallback (internal/process/next_tick.js:61:11)

// The issue seems to be related to https://github.com/webtorrent/bittorrent-protocol/issues/44

// The test will pass if we disable the call to WebTorrentPaidStreamingClient.testTorrentingCapability() inside App.tsx

// Currently the App.tsx component is arguably responsible for too much: e.g. enabling the web3torrent client and state channel provider. We should figure out a way to test the rendering of App.tsx in isolation from that; possibly by moving the WebTorrentPaidStreamingClient.enable() call elsewhere.
// https://github.com/statechannels/monorepo/issues/1291

afterAll(() => {
  web3torrent.destroy();
});

it.skip('renders app without crashing', () => {
  const div = document.createElement('div');

  ReactDOM.render(
    <WebTorrentContext.Provider value={web3torrent}>
      <App />
    </WebTorrentContext.Provider>,
    div
  );

  ReactDOM.unmountComponentAtNode(div);
});
