import {defaultFile, defaultLeechingOptions, defaultSeedingOptions} from '../testing/test-utils';
import WebTorrentPaidStreamingClient, {ClientEvents} from '../web3torrent-lib';
import {web3TorrentChannelClient} from '../../clients/web3t-channel-client';

describe('Seeding and Leeching - 35sec', () => {
  let seeder: WebTorrentPaidStreamingClient;
  let leecher: WebTorrentPaidStreamingClient;

  beforeEach(() => {
    seeder = new WebTorrentPaidStreamingClient(
      {pseAccount: '3', dht: false},
      web3TorrentChannelClient
    );
    seeder.on('error', (err: any) => fail(err));
    seeder.on('warning', (err: any) => fail(err));

    leecher = new WebTorrentPaidStreamingClient(
      {pseAccount: '4', dht: false},
      web3TorrentChannelClient
    );
    leecher.on('error', (err: any) => fail(err));
    leecher.on('warning', (err: any) => fail(err));
  });

  it('should be able to unchoke and finish a download after 35 seconds', done => {
    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({peerAccount}) => {
        setTimeout(() => seeder.togglePeer(seededTorrent.infoHash, peerAccount), 35000);
        leecher.once(ClientEvents.TORRENT_DONE, leechedTorrent => {
          expect(seededTorrent.files[0].done).toEqual(leechedTorrent.files[0].done);
          done();
        });
      });
      leecher.add(seededTorrent.magnetURI, defaultLeechingOptions);
    });
  }, 45000);

  afterEach(() => {
    seeder.destroy();
    leecher.destroy();
  });
});
