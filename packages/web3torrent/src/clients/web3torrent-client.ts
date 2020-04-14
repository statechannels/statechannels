import React from 'react';
import {WebTorrentAddInput, WebTorrentSeedInput} from '../library/types';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';
import {Status, Torrent} from '../types';
import {paymentChannelClient} from './payment-channel-client';
import {defaultTrackers} from '../constants';

export const web3torrent = new WebTorrentPaidStreamingClient({
  paymentChannelClient: paymentChannelClient,
  tracker: {announce: defaultTrackers}
});

export const Web3TorrentContext = React.createContext(web3torrent);

export const getTorrentPeers = infoHash => web3torrent.peersList[infoHash];

export const download: (torrent: WebTorrentAddInput) => Promise<Torrent> = torrentData => {
  return new Promise(resolve =>
    web3torrent.enable().then(() => {
      web3torrent.add(torrentData, (torrent: any) =>
        resolve({...torrent, status: Status.Connecting})
      );
    })
  );
};

export const upload: (input: WebTorrentSeedInput) => Promise<Torrent> = input => {
  return new Promise(resolve =>
    web3torrent.enable().then(() => {
      web3torrent.seed(input, {...torrentNamer(input)}, (torrent: any) => {
        resolve({
          ...torrent,
          status: Status.Seeding,
          originalSeed: true
        });
      });
    })
  );
};

export const cancel = (id: string = '') => {
  return new Promise((resolve, reject) =>
    web3torrent.cancel(id, err => {
      if (err) {
        reject(err);
      } else {
        resolve(id);
      }
    })
  );
};

const torrentNamer = (input: WebTorrentSeedInput) => {
  if ((input as FileList).length && (input as FileList).length > 1) {
    return {name: `various.zip`};
  }
  return {};
};
