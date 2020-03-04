import React from 'react';
import {WebTorrentAddInput, WebTorrentSeedInput} from '../library/types';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';
import {Status, Torrent} from '../types';
import {paymentChannelClient} from './payment-channel-client';

export const web3torrent = new WebTorrentPaidStreamingClient({
  paymentChannelClient: paymentChannelClient
});

export const WebTorrentContext = React.createContext(web3torrent);

export const getTorrentPeers = infoHash => web3torrent.peersList[infoHash];

export const download: (torrent: WebTorrentAddInput) => Promise<Torrent> = torrentData => {
  return new Promise(resolve =>
    web3torrent.add(torrentData, (torrent: any) => resolve({...torrent, status: Status.Connecting}))
  );
};

export const upload: (files: WebTorrentSeedInput) => Promise<Torrent> = files => {
  return new Promise(resolve =>
    web3torrent.seed(files as FileList, (torrent: any) => {
      resolve({
        ...torrent,
        status: Status.Seeding,
        cost: String(torrent.length * 0.000005),
        originalSeed: true
      });
    })
  );
};

export const remove = (id: string = '') => {
  return new Promise((resolve, reject) =>
    web3torrent.remove(id, err => {
      if (err) {
        reject(err);
      } else {
        resolve(id);
      }
    })
  );
};
