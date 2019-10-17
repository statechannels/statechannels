import {web3torrent} from '../clients/web3torrent-client';
import {ExtendedTorrent} from '../library/types';
import {Status, Torrent} from '../types';

const getStatus = (torrent: ExtendedTorrent, previousStatus: Status): Status => {
  const {uploadSpeed, downloadSpeed, progress, done} = torrent;
  if (previousStatus === Status.Seeding) {
    return Status.Seeding;
  }
  if (progress && done) {
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

export default (previousData: Torrent, infoHash): Torrent => {
  if (!infoHash) {
    // torrent in magnet form
    return {...previousData, status: Status.Idle};
  }

  const live = web3torrent.get(infoHash) as ExtendedTorrent;
  if (!live) {
    // torrent after being destroyed
    return {...previousData, destroyed: true, status: Status.Idle};
  }

  return {
    // active torrent
    ...previousData,
    ...live,
    ...{
      name: live.name || previousData.name,
      length: live.length || previousData.length,
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
