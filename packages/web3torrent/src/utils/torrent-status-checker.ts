import {web3torrent} from '../clients/web3torrent-client';
import {ExtendedTorrent} from '../library/types';
import {Status, Torrent} from '../types';

export const getStatus = (torrent: ExtendedTorrent): Status => {
  const {uploadSpeed, downloadSpeed, progress, uploaded, done, createdBy} = torrent;
  if (createdBy) {
    return Status.Seeding;
  }
  if (progress && done) {
    if (uploaded) {
      return Status.Seeding;
    }
    return Status.Completed;
  }
  if (uploadSpeed - downloadSpeed === 0) {
    return Status.Connecting;
  }
  return Status.Downloading;
};

export const getFormattedETA = (torrent: ExtendedTorrent) => {
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

export default (previousData: Torrent, infoHash): Torrent => {
  if (!infoHash) {
    // torrent in magnet form
    return {...previousData, status: Status.Idle};
  }

  const live = web3torrent.get(infoHash) as ExtendedTorrent;
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
      status: getStatus(live),
      uploadSpeed: live.uploadSpeed,
      downloadSpeed: live.downloadSpeed,
      numPeers: live.numPeers,
      parsedTimeRemaining: getFormattedETA(live),
      ready: true
    }
  };
};
