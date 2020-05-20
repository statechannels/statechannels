import {Status, TorrentUI, TorrentStaticData} from '../types';
import WebTorrentPaidStreamingClient, {PaidStreamingTorrent} from '../library/web3torrent-lib';
import WebTorrent from 'webtorrent';
import {getStaticTorrentUI} from '../constants';

export const getStatus = (torrent: WebTorrent.Torrent, pseAccount: string): Status => {
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

export function getFormattedETA(done: boolean, timeRemaining: number) {
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
}

export const getPeerStatus = (torrent, wire) => {
  if (!wire) return false;
  const peerId = wire.peerId;
  return Object.keys(torrent._peers).includes(peerId);
};

export function getTorrentUI(
  web3Torrent: WebTorrentPaidStreamingClient,
  staticData: TorrentStaticData
): TorrentUI {
  const staticTorrent = getStaticTorrentUI(staticData.infoHash, staticData.name, staticData.length);

  const liveTorrent = web3Torrent.get(staticData.infoHash) as PaidStreamingTorrent;
  if (!liveTorrent) {
    return {
      ...staticTorrent,
      downloaded: 0,
      status: Status.Idle
    };
  }

  return {
    ...staticTorrent,
    // The spread operator above doesn't quite work for property definitions below
    // It might be because WebTorrent.Torrent uses getters for these properties?
    files: liveTorrent.files,
    wires: liveTorrent.wires,
    done: liveTorrent.done,
    downloaded: liveTorrent.downloaded || staticTorrent.downloaded,
    downloadSpeed: liveTorrent.downloadSpeed,
    length: liveTorrent.length || staticTorrent.length,
    magnetURI: liveTorrent.magnetURI || staticTorrent.magnetURI,
    name: liveTorrent.name || staticTorrent.name,
    numPeers: liveTorrent.numPeers,
    ready: true,
    paused: liveTorrent.paused,
    status: getStatus(liveTorrent, web3Torrent.pseAccount),
    uploadSpeed: liveTorrent.uploadSpeed,
    parsedTimeRemaining: getFormattedETA(liveTorrent.done, liveTorrent.timeRemaining),
    originalSeed: liveTorrent.createdBy === web3Torrent.pseAccount
  };
}
