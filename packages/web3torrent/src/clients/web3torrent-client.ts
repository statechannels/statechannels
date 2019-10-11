import React from 'react';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';
import {Torrent} from '../types';

export const web3torrent = new WebTorrentPaidStreamingClient();
export const WebTorrentContext = React.createContext(web3torrent);

export const download: (torrent: any) => Promise<Torrent> = torrentData =>
  new Promise(resolve =>
    web3torrent.add(torrentData, torrent => resolve({...torrent, status: 'Connecting'}))
  );

export const upload = files =>
  new Promise(resolve => web3torrent.seed(files as FileList, torrent => resolve(torrent)));

export const remove = (id: string) => {
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

const getStatus = (torrent: Torrent) => {
  const {uploadSpeed, downloadSpeed} = torrent;
  if (torrent.downloaded && torrent.downloaded === torrent.length && torrent.done) {
    return 'Completed';
  } else if (torrent.destroyed) {
    return 'Stopped';
  }

  if (uploadSpeed - downloadSpeed === 0) {
    return 'Connecting';
  } else if (uploadSpeed - downloadSpeed > 0) {
    return 'Seeding';
  } else {
    return 'Downloading';
  }
};

const getFormattedETA = (torrent: Torrent) => {
  const {done, timeRemaining} = torrent;
  if (done) {
    return 'Done';
  } else {
    const remaining = timeRemaining || 0;
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    return timeRemaining === Infinity
      ? 'ETA Unknown'
      : `ETA ${(days && days + 'd ') || ''}${(hours && hours + 'h ') || ''}${(minutes &&
          minutes + 'm ') ||
          ''}${seconds && seconds + 's'}`;
  }
};

export const getLiveTorrentData = (previousData: Torrent, infoHash): Torrent => {
  const baseData: Torrent = {
    ...previousData,
    name: previousData.name || 'unknown',
    status: 'Connecting',
    done: false,
    ready: false,
    downloaded: 0
  };

  if (!infoHash) {
    // torrent in magnet form
    return {...baseData, status: 'Idle'};
  }

  const live = web3torrent.get(infoHash) as Torrent;
  if (!live) {
    // torrent after being destroyed
    return {...baseData, destroyed: true, status: 'Idle'};
  }

  return {
    // active torrent
    ...baseData,
    ...live,
    ...{
      name: live.name || baseData.name,
      length: live.length || baseData.length,
      downloaded: (live && live.downloaded) || 0,
      status: getStatus(live),
      uploadSpeed: live.uploadSpeed,
      downloadSpeed: live.downloadSpeed,
      numPeers: live.numPeers,
      parsedTimeRemaining: getFormattedETA(live),
      ready: true
    }
  };
};

export const parseMagnetURL: (rawMagnetURL: string) => Torrent = (rawMagnetURL = '') => {
  const emptyTorrentData = {
    name: 'unknown',
    magnetURI: rawMagnetURL || '',
    infoHash: '',
    length: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    cost: 0,
    status: 'Idle',
    downloaded: 0,
    files: []
  } as Torrent;
  if (!rawMagnetURL.trim()) {
    return emptyTorrentData;
  }
  const magnetURI = rawMagnetURL.trim().substring(1);
  const magnetAsArray = magnetURI.split('&');

  const magnetName = magnetAsArray.find(h => h.includes('dn=') || h.includes('name='));
  const name = magnetName && magnetName.replace(/(dn=)|(name=)/g, '').replace(/\+/g, ' ');

  const magnetLength = magnetAsArray.find(h => h.includes('xl='));
  const length: number = Number(magnetLength && magnetLength.replace(/(xl=)/g, ''));

  const magnetCost = magnetAsArray.find(h => h.includes('cost='));
  const cost: number = Number(magnetCost && magnetCost.replace(/(cost=)/g, ''));

  return {
    ...emptyTorrentData,
    name,
    magnetURI,
    length: isNaN(length) ? 0 : length,
    cost: isNaN(cost) ? 0 : cost
  };
};
