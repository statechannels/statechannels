import {Client} from 'bittorrent-tracker';
import {defaultTrackerOpts} from '../constants';
import {TorrentTestResult} from '../library/types';
import {logger} from '../logger';
const log = logger.child({module: 'tracker-check'});

export async function checkTorrentInTracker(infoHash: string): Promise<TorrentTestResult> {
  log.info(`Scraping tracker for torrent ${infoHash}`);

  const client = new Client({...defaultTrackerOpts, infoHash: [infoHash]});
  const trackerScrape: Promise<number> = new Promise(resolve => {
    client.once('scrape', data => resolve(data.complete));
    setTimeout(() => client.scrape(), 2500); // waits ~2 seconds as that's the tracker update tick
    setTimeout(() => resolve(-1), 5000); // returns -1 if there was no answer from the tracker(s) for ~2.5 seconds
  });

  const scrapeResult = await trackerScrape;
  client.stop();
  client.destroy();

  /**
   * scrapeResult is always a number.
   * If it's 0+ it means the scrape call was sucessfull. And 0+ people
   * have a complete copy of the torrent and an active connection with the tracker.
   *
   * If it's -1, it means the timeout triggered before the tracker answered.
   * We give the tracker 2.5 seconds to give a response (it's a really small json object)
   */

  if (scrapeResult > 0) {
    log.info(`Test Result: SEEDERS_FOUND (${scrapeResult})`);
    return TorrentTestResult.SEEDERS_FOUND; // Found seeders (peers with the complete torrent)
  } else if (scrapeResult < 0) {
    log.error('Test Result: NO_CONNECTION');
    return TorrentTestResult.NO_CONNECTION;
  }
  log.warn('Test Result: NO_SEEDERS_FOUND');
  return TorrentTestResult.NO_SEEDERS_FOUND; // was able to connect, but no seeders found
}
