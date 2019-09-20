import WebTorrentPaidStreamingClient, { ClientEvents } from '../../src/web3torrent-lib';
import { defaultFile, defaultLeechingOptions, defaultSeedingOptions } from '../utils';

describe('Seeding and Leeching - 5sec', () => {
  let seeder: WebTorrentPaidStreamingClient;
  let leecher: WebTorrentPaidStreamingClient;

  beforeEach(() => {
    seeder = new WebTorrentPaidStreamingClient({ pseAccount: '3', dht: false });
    seeder.on('error', (err: any) => fail(err));
    seeder.on('warning', (err: any) => fail(err));

    leecher = new WebTorrentPaidStreamingClient({ pseAccount: '4', dht: false });
    leecher.on('error', (err: any) => fail(err));
    leecher.on('warning', (err: any) => fail(err));
  });

  it('should be able to unchoke and finish a download after 5 seconds', done => {
    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({ peerAccount }) => {
        setTimeout(() => seeder.togglePeer(seededTorrent.infoHash, peerAccount), 5000);
        leecher.once(ClientEvents.TORRENT_DONE, leechedTorrent => {
          expect(seededTorrent.files[0].done).toEqual(leechedTorrent.files[0].done);
          done();
        });
      });
      leecher.add(seededTorrent.magnetURI, defaultLeechingOptions);
    });
  }, 15000);

  afterEach(() => {
    seeder.destroy();
    leecher.destroy();
  });
});
