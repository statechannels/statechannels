import MemoryChunkStore from 'memory-chunk-store';
import {
  defaultFile,
  defaultFileMagnetURI,
  defaultSeedingOptions,
  defaultTorrentHash,
  mockMetamask
} from './testing/test-utils';
import WebTorrentPaidStreamingClient, {
  ClientEvents,
  PaidStreamingExtensionNotices,
  PaidStreamingTorrent
} from './web3torrent-lib';
import {PaymentChannelClient, ChannelState} from '../clients/payment-channel-client';
import {ChannelClient, FakeChannelProvider} from '@statechannels/channel-client';

describe('Seeding and Leeching', () => {
  let seeder: WebTorrentPaidStreamingClient;
  let leecher: WebTorrentPaidStreamingClient;

  beforeAll(() => {
    mockMetamask();
  });

  beforeEach(() => {
    seeder = new WebTorrentPaidStreamingClient({
      pseAccount: '1',
      dht: false,
      paymentChannelClient: new PaymentChannelClient(new ChannelClient(new FakeChannelProvider())) // use distinct provider & client
    });
    seeder.on('error', err => fail(err));
    seeder.on('warning', err => fail(err));
    seeder.paymentChannelClient.channelCache = {};

    leecher = new WebTorrentPaidStreamingClient({
      pseAccount: '2',
      dht: false,
      paymentChannelClient: new PaymentChannelClient(new ChannelClient(new FakeChannelProvider())) // use distinct provider & client
    });
    leecher.on('error', err => fail(err));
    leecher.on('warning', err => fail(err));
    leecher.paymentChannelClient.channelCache = {};
  });

  it('should seed and remove a Torrent', done => {
    expect(seeder.pseAccount).toBe('1');
    seeder.seed(defaultFile as File, defaultSeedingOptions(false), seededTorrent => {
      expect(seeder.torrents.length).toEqual(1);
      expect(seededTorrent.infoHash).toEqual(defaultTorrentHash);
      expect(seededTorrent.magnetURI).toEqual(defaultFileMagnetURI);
      expect((seededTorrent as PaidStreamingTorrent).usingPaidStreaming).toBe(true);
      done();
    });
  });

  it('should perform the extended handshake between seeder and leecher', done => {
    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      leecher.add(seededTorrent.magnetURI, {store: MemoryChunkStore}, () => {
        expect(leecher.torrents.length).toEqual(1);
        expect(seeder.torrents[0].wires.length).toEqual(1);
        expect(leecher.torrents[0].wires.length).toEqual(1);
        expect(
          leecher.torrents[0].wires.some(
            wire =>
              wire.paidStreamingExtension.peerAccount === seeder.pseAccount &&
              wire.paidStreamingExtension.pseAccount === leecher.pseAccount
          )
        ).toBe(true);
        done();
      });
    });
  }, 10000);

  it('should reach a ready-for-leeching, choked state', done => {
    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({torrentPeers}) => {
        expect(torrentPeers[`${leecher.pseAccount}`].allowed).toEqual(false);
        done();
      });
      leecher.add(seededTorrent.magnetURI, {store: MemoryChunkStore});
    });
  }, 10000);

  it('should unchoke when seeder unblocks leecher', done => {
    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({peerAccount}) => {
        seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({torrentPeers}) => {
          expect(torrentPeers[`${leecher.pseAccount}`].allowed).toEqual(true);
          done();
        });
        seeder.togglePeer(seededTorrent.infoHash, peerAccount);
      });

      leecher.add(seededTorrent.magnetURI, {store: MemoryChunkStore});
    });
  }, 10000);

  afterEach(() => {
    seeder.destroy();
    leecher.destroy();
  });
});
