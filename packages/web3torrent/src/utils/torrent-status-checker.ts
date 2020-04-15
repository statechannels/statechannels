import {Status, Torrent} from '../types';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';

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

export function torrentStatusChecker(
  web3Torrent: WebTorrentPaidStreamingClient,
  previousData: Torrent,
  infoHash: string
): Torrent {
  if (!infoHash) {
    // torrent in magnet form
    return {...previousData, status: Status.Idle};
  }

  const live = web3Torrent.get(infoHash) as Torrent;
  if (!live) {
    // torrent after being destroyed
    return {...previousData, downloaded: 0, status: Status.Idle};
  }

  return {
    // active torrent
    ...previousData,
    ...live,
    ...{
      name: live.name || previousData.name,
      length: live.length || previousData.length,
      downloaded: live.downloaded || 0,
      status: getStatus(live, web3Torrent.pseAccount),
      uploadSpeed: live.uploadSpeed,
      downloadSpeed: live.downloadSpeed,
      numPeers: live.numPeers,
      parsedTimeRemaining: getFormattedETA(live),
      ready: true,
      originalSeed: live.createdBy === web3Torrent.pseAccount
    }
  };
}
