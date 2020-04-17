import {Client} from 'bittorrent-tracker';
import {defaultTrackerOpts} from '../constants';
import {TorrentTestResult} from '../library/types';

export async function checkTorrentInTracker(infoHash: string) {
  const trackerClient: Client = new Client({
    ...defaultTrackerOpts,
    infoHash: [infoHash]
  });
  let completePeers;
  const gotAWire: Promise<boolean> = new Promise(resolve => {
    const updateIfSeederFound = data => {
      completePeers = data.complete;
    };
    trackerClient.once('peer', function() {
      resolve(true);
    });
    trackerClient.once('update', updateIfSeederFound);
    trackerClient.start();
  });
  const timer: Promise<undefined> = new Promise((resolve, _) => setTimeout(resolve, 5000));
  const raceResult = await Promise.race([gotAWire, timer]);
  trackerClient.stop();
  trackerClient.destroy();
  if (raceResult) {
    return TorrentTestResult.SEEDERS_FOUND; // Could connect to a peer
  }
  if (Number.isInteger(completePeers)) {
    // was able to connect to the tracker, but couldn't connect to a peer
    return TorrentTestResult.NO_SEEDERS_FOUND;
  }
  return TorrentTestResult.NO_CONNECTION; // wasn't able to get a response from the tracker
}
