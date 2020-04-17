import {Client} from 'bittorrent-tracker';
import {defaultTrackerOpts} from '../constants';
import {TorrentTestResult} from '../library/types';
import debug from 'debug';
const log = debug('web3torrent:tracker-check');

export async function checkTorrentInTracker(infoHash: string) {
  log(`Scraping tracker for torrent ${infoHash}`);
  const trackerClient: Client = new Client({
    ...defaultTrackerOpts,
    infoHash: [infoHash]
  });
  const trackerScrape: Promise<number> = new Promise(resolve => {
    trackerClient.once('scrape', data => resolve(data.complete));
    setTimeout(() => trackerClient.scrape(), 2500); // waits ~2 seconds as that's the tracker update tick
  });
  const timer: Promise<undefined> = new Promise((resolve, _) => setTimeout(resolve, 5000));

  const raceResult = await Promise.race([trackerScrape, timer]);
  trackerClient.stop(); // cleanup
  trackerClient.destroy(); // cleanup

  if (Number.isInteger(raceResult)) {
    if (raceResult > 0) {
      log(`Test Result: SEEDERS_FOUND (${raceResult})`);
      return TorrentTestResult.SEEDERS_FOUND; // Found seeders (peers with the complete torrent)
    }
    log('Test Result: NO_SEEDERS_FOUND');
    return TorrentTestResult.NO_SEEDERS_FOUND; // was able to connect, but no seeders found
  }
  log('Test Result: NO_CONNECTION');
  return TorrentTestResult.NO_CONNECTION; // wasn't able to get a response from the tracker
}
