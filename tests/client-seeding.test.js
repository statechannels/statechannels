import fixtures from 'webtorrent-fixtures';
import WebTorrent, { ClientEvents } from './../src/web3torrent-lib';

describe('Seeding and Leeching', () => {
  let seeder, leecher;

  beforeEach(() => {
    seeder = new WebTorrent({ pseAccount: 1, dht: false });
    seeder.on('error', err => {
      fail(err);
    });
    seeder.on('warning', err => {
      fail(err);
    });
    seeder.on(ClientEvents.PEER_STATUS_CHANGED, () => {
      console.log('Peer status changed');
    });
    leecher = new WebTorrent({ pseAccount: 2, dht: false });
    leecher.on('error', err => {
      fail(err);
    });
    leecher.on('warning', err => {
      fail(err);
    });
  });

  it('Seed and remove a Torrent', done => {
    expect(seeder.pseAccount).toBe(1);
    seeder.seed(
      new Blob([fixtures.leaves.content]),
      { name: 'Leaves of Grass by Walt Whitman.epub', announce: [process.env.TRACKER_URL] },
      torrent => {
        expect(seeder.torrents.length).toEqual(1);
        expect(torrent.infoHash).toEqual(fixtures.leaves.parsedTorrent.infoHash);
        expect(torrent.magnetURI).toEqual(
          `${fixtures.leaves.magnetURI}&tr=${encodeURIComponent(process.env.TRACKER_URL)}`
        );
        expect(torrent.usingPaidStreaming).toBe(true);
        done();
      }
    );
  });

  it('Seed and Leech', done => {
    seeder.seed(
      new Blob([fixtures.leaves.content]),
      { name: 'Leaves of Grass by Walt Whitman.epub', announce: [process.env.TRACKER_URL] },
      seededTorrent => {
        leecher.add(seededTorrent.magnetURI, () => {
          expect(leecher.torrents.length).toEqual(1);
          expect(seeder.torrents[0].wires.length).toEqual(1);
          expect(leecher.torrents[0].wires.length).toEqual(1);
          expect(leecher.torrents[0].wires[0].paidStreamingExtension.peerAccount).toEqual(seeder.pseAccount);
          expect(leecher.torrents[0].wires[0].paidStreamingExtension.pseAccount).toEqual(leecher.pseAccount);
          done();
        });
      }
    );
  }, 10000);

  afterEach(() => {
    seeder.destroy();
    leecher.destroy();
  });
});
