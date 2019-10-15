import React from 'react';
import WebTorrentPaidStreamingClient, {ExtendedTorrent} from '../library/web3torrent-lib';
import {defaultTrackers, EmptyTorrent, Status, Torrent} from '../types';
export const web3torrent = new WebTorrentPaidStreamingClient();
export const WebTorrentContext = React.createContext(web3torrent);

export const download: (torrent: any) => Promise<Torrent> = torrentData =>
  new Promise(resolve =>
    web3torrent.add(torrentData, torrent => resolve({...torrent, status: Status.Connecting}))
  );

export const upload: (files: any) => Promise<Torrent> = files =>
  new Promise(resolve =>
    web3torrent.seed(files as FileList, torrent => resolve({...torrent, status: Status.Seeding}))
  );

export const getTorrentPeers = infoHash => web3torrent.allowedPeers[infoHash];

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

const getStatus = (torrent: ExtendedTorrent, previousStatus: Status): Status => {
  const {uploadSpeed, downloadSpeed} = torrent;
  if (previousStatus === Status.Seeding) {
    return Status.Seeding;
  }
  if (torrent.progress && torrent.done) {
    return Status.Completed;
  }
  if (uploadSpeed - downloadSpeed === 0) {
    return Status.Connecting;
  }
  return Status.Downloading;
};

const getFormattedETA = (torrent: ExtendedTorrent) => {
  const {done, timeRemaining} = torrent;
  if (done) {
    return 'Done';
  }
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
};

export const getLiveTorrentData = (previousData: Torrent, infoHash): Torrent => {
  const baseData: Torrent = {
    ...previousData,
    name: previousData.name || 'unknown',
    status: Status.Connecting
  };

  if (!infoHash) {
    // torrent in magnet form
    return {...baseData, status: Status.Idle};
  }

  const live = web3torrent.get(infoHash) as ExtendedTorrent;
  if (!live) {
    // torrent after being destroyed
    return {...baseData, destroyed: true, status: Status.Idle};
  }

  return {
    // active torrent
    ...baseData,
    ...live,
    ...{
      name: live.name || baseData.name,
      length: live.length || baseData.length,
      downloaded: (live && live.downloaded) || 0,
      status: getStatus(live, previousData.status),
      uploadSpeed: live.uploadSpeed,
      downloadSpeed: live.downloadSpeed,
      numPeers: live.numPeers,
      parsedTimeRemaining: getFormattedETA(live),
      ready: true
    }
  };
};

export const parseMagnetURL: (rawMagnetURL: string) => Torrent = (rawMagnetURL = '') => {
  const emptyTorrentData = {...EmptyTorrent, magnetURI: rawMagnetURL} as Torrent;
  if (!rawMagnetURL.trim()) {
    return emptyTorrentData;
  }
  const magnetParams = new URLSearchParams(rawMagnetURL.trim().replace(/#magnet:/g, ''));

  if (!magnetParams.has('tr')) {
    defaultTrackers.map(tr => magnetParams.append('tr', tr));
  }

  return {
    ...emptyTorrentData,
    name: magnetParams.get('name') || magnetParams.get('dn') || 'unknown',
    magnetURI: `magnet:?${magnetParams.toString()}`,
    length: Number(magnetParams.get('xl')) || 0,
    cost: Number(magnetParams.get('cost')) || 0
  };
};

export const generateMagnetURL = (torrent: Torrent) => {
  if (!torrent.magnetURI) {
    return '';
  }
  const magnetParams = new URLSearchParams(torrent.magnetURI.replace(/magnet:/g, ''));
  magnetParams.delete('tr');
  magnetParams.append('xl', String(torrent.length));
  magnetParams.append('cost', String(torrent.cost));
  return `${window.location.origin}/download/magnet#magnet:?${magnetParams.toString()}`;
};
