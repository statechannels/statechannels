import MemoryChunkStore from 'memory-chunk-store';
import fixtures from 'webtorrent-fixtures';
import WebTorrent, { ClientEvents, PaidStreamingExtensionNotices } from './../src/web3torrent-lib';

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

  it('should seed and remove a Torrent', done => {
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

  it('should perform the extended handshake between seeder and leecher', done => {
    seeder.seed(
      new Blob([fixtures.leaves.content]),
      { name: 'Leaves of Grass by Walt Whitman.epub', announce: [process.env.TRACKER_URL] },
      seededTorrent => {
        leecher.add(seededTorrent.magnetURI, { store: MemoryChunkStore }, () => {
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

  it('should reach a ready-for-leeching, choked state', done => {
    seeder.seed(
      new Blob([fixtures.leaves.content]),
      { name: 'Leaves of Grass by Walt Whitman.epub', announce: [process.env.TRACKER_URL], store: MemoryChunkStore },
      seededTorrent => {
        seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({ allowedPeers }) => {
          expect(allowedPeers[`${leecher.pseAccount}`].allowed).toEqual(false);

          done();
        });

        leecher.add(seededTorrent.magnetURI, { store: MemoryChunkStore });
      }
    );
  }, 10000);

  it('should be able to unchoke and finish a download', done => {
    seeder.seed(
      new Blob([fixtures.leaves.content]),
      { name: 'Leaves of Grass by Walt Whitman.epub', announce: [process.env.TRACKER_URL], store: MemoryChunkStore },
      seededTorrent => {
        seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({ peerAccount }) => {
          seeder.togglePeer(seededTorrent.infoHash, peerAccount);

          seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({ allowedPeers }) => {
            expect(allowedPeers[`${leecher.pseAccount}`].allowed).toEqual(true);
          });

          seeder.once(ClientEvents.TORRENT_NOTICE, (_, __, command, ___) => {
            expect(command).toEqual(PaidStreamingExtensionNotices.ACK);

            leecher.once(ClientEvents.TORRENT_DONE, leechedTorrent => {
              expect(seededTorrent.files[0].done).toEqual(leechedTorrent.files[0].done);
              expect(seededTorrent.files[0].length).toEqual(leechedTorrent.files[0].length);
              expect(seededTorrent.files[0].name).toEqual(leechedTorrent.files[0].name);
              done();
            });
          });
        });

        leecher.add(seededTorrent.magnetURI, { store: MemoryChunkStore });
      }
    );
  }, 10000);

  afterEach(() => {
    seeder.destroy();
    leecher.destroy();
  });
});
