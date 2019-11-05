import React from 'react';
import {ClientEvents, WebTorrentAddInput, WebTorrentSeedInput} from '../library/types';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';
import {Status, Torrent} from '../types';
export const web3torrent = new WebTorrentPaidStreamingClient();
export const WebTorrentContext = React.createContext(web3torrent);

export const getTorrentPeers = infoHash => web3torrent.allowedPeers[infoHash];

export const download: (torrent: WebTorrentAddInput) => Promise<Torrent> = torrentData => {
  web3torrent.on(
    // TODO: Remove when protocol is defined
    ClientEvents.PEER_STATUS_CHANGED,
    ({torrentPeers, torrentInfoHash, peerAccount}) => {
      if (!torrentPeers[peerAccount].allowed) {
        web3torrent.togglePeer(torrentInfoHash, peerAccount);
      }
    }
  );

  return new Promise(resolve =>
    web3torrent.add(torrentData, (torrent: any) => resolve({...torrent, status: Status.Connecting}))
  );
};

export const upload: (files: WebTorrentSeedInput) => Promise<Torrent> = files => {
  web3torrent.on(
    // TODO: Remove when protocol is defined
    ClientEvents.PEER_STATUS_CHANGED,
    ({torrentPeers, torrentInfoHash, peerAccount}) => {
      if (!torrentPeers[peerAccount].allowed) {
        web3torrent.togglePeer(torrentInfoHash, peerAccount);
      }
    }
  );

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
