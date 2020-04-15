import {Status, Torrent} from '../types';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';
import {parseURL} from './magnet';

export const getStatus = (torrent: Torrent, pseAccount: string): Status => {
  const {uploadSpeed, downloadSpeed, progress, uploaded, paused, done, createdBy} = torrent;
  if (createdBy && createdBy === pseAccount) {
    return Status.Seeding;
  }
  if (progress && done) {
    if (uploaded) {
      return Status.Seeding;
    }
    return Status.Completed;
  }
  if (paused) {
    return Status.Paused;
  }
  if (uploadSpeed - downloadSpeed === 0) {
    return Status.Connecting;
  }
  return Status.Downloading;
};

export const getFormattedETA = (torrent: Torrent) => {
  const {done, timeRemaining} = torrent;
  if (done) {
    return 'Done';
  }
  if (timeRemaining === Infinity) {
    return 'ETA Unknown';
  }

  const remaining = timeRemaining || 0;

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  return [
    'ETA',
    (days && ' ' + days + 'd') || '',
    (hours && ' ' + hours + 'h') || '',
    (minutes && ' ' + minutes + 'm') || '',
    !days && !hours ? ' ' + seconds + 's' : ''
  ].join('');
};

export const getPeerStatus = (torrent, wire) => {
  if (!wire) return false;
  const peerId = wire.peerId;
  return Object.keys(torrent._peers).includes(peerId);
};

export interface UrlData {
  infoHash: string;
  queryParams: URLSearchParams;
}

export function getTorrent(web3Torrent: WebTorrentPaidStreamingClient, urlData: UrlData): Torrent {
  const staticTorrent = parseURL(urlData.infoHash, urlData.queryParams);
  // todo: we shouldn't be force casting objects
  const liveTorrent = web3Torrent.get(urlData.infoHash) as Torrent;
  if (!liveTorrent) {
    return {
      ...staticTorrent,
      downloaded: 0,
      status: Status.Idle
    };
  }

  return {
    ...staticTorrent,
    ...liveTorrent,
    // The spread operator above doesn't quite work for property definitions below
    // It might be because WebTorrent.Torrent uses getters for these properties?
    name: liveTorrent.name || staticTorrent.name,
    length: liveTorrent.length || staticTorrent.length,
    downloaded: liveTorrent.downloaded || 0,
    status: getStatus(liveTorrent, web3Torrent.pseAccount),
    uploadSpeed: liveTorrent.uploadSpeed,
    downloadSpeed: liveTorrent.downloadSpeed,
    numPeers: liveTorrent.numPeers,
    parsedTimeRemaining: getFormattedETA(liveTorrent),
    ready: true,
    originalSeed: liveTorrent.createdBy === web3Torrent.pseAccount
  };
}
