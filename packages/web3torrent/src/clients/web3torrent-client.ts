import React from 'react';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';

export const web3torrent = new WebTorrentPaidStreamingClient();
export const WebTorrentContext = React.createContext(web3torrent);

export const download = torrentData =>
  new Promise(resolve => web3torrent.add(torrentData, torrent => resolve(torrent)));

export const upload = files =>
  new Promise(resolve => web3torrent.seed(files as FileList, torrent => resolve(torrent)));
