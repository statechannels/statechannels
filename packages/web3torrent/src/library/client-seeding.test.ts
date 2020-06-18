import MemoryChunkStore from 'memory-chunk-store';
import {
  defaultFile,
  defaultFileMagnetURI,
  defaultSeedingOptions,
  defaultTorrentHash,
  mockMetamask,
  togglePeerByChannel
} from './testing/test-utils';
import WebTorrentPaidStreamingClient, {ClientEvents, PaidStreamingTorrent} from './web3torrent-lib';
import {PaymentChannelClient} from '../clients/payment-channel-client';
import {ChannelClient, FakeChannelProvider} from '@statechannels/channel-client';

async function defaultClient(): Promise<WebTorrentPaidStreamingClient> {
  const client = new WebTorrentPaidStreamingClient({
    dht: false,
    paymentChannelClient: new PaymentChannelClient(new ChannelClient(new FakeChannelProvider()))
  });
  client.on('error', err => fail(err));
  client.on('warning', err => fail(err));
  client.paymentChannelClient.channelCache = {};
  await client.enable();

  return client;
}

describe('Seeding and Leeching', () => {
  let seeder: WebTorrentPaidStreamingClient;
  let leecherA: WebTorrentPaidStreamingClient;
  let leecherB: WebTorrentPaidStreamingClient;

  beforeAll(() => {
    mockMetamask();
  });

  beforeEach(async () => {
    seeder = await defaultClient();
    leecherA = await defaultClient();
    leecherB = await defaultClient();
  });

  it('should throw when the client is not enabled', async done => {
    await seeder.disable();
    expect(() => {
      seeder.seed(defaultFile as File, defaultSeedingOptions(false));
    }).toThrow();
    done();
  });

  it('should seed and remove a Torrent', async done => {
    const torrent = seeder.seed(
      defaultFile as File,
      defaultSeedingOptions(false),
      seededTorrent => {
        expect(seeder.torrents.length).toEqual(1);
        expect(seededTorrent.infoHash).toEqual(defaultTorrentHash);
        expect(seededTorrent.magnetURI).toEqual(defaultFileMagnetURI);
        expect((seededTorrent as PaidStreamingTorrent).usingPaidStreaming).toBe(true);
      }
    );

    seeder.remove(torrent, err => {
      expect(err).toBeFalsy();
      expect(seeder.torrents.length).toEqual(0);
      done();
    });
  });

  it('should perform the extended handshake between seeder and leecher', done => {
    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      leecherA.add(seededTorrent.magnetURI, {store: MemoryChunkStore}, () => {
        expect(leecherA.torrents.length).toEqual(1);
        expect(seeder.torrents[0].wires.length).toEqual(1);
        expect(leecherA.torrents[0].wires.length).toEqual(1);
        expect(
          leecherA.torrents[0].wires.some(
            wire =>
              wire.paidStreamingExtension.peerAccount === seeder.pseAccount &&
              wire.paidStreamingExtension.pseAccount === leecherA.pseAccount
          )
        ).toBe(true);
        done();
      });
    });
  });

  it('should reach a ready-for-leeching, choked state', done => {
    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({torrentPeers, seedingChannelId}) => {
        expect(torrentPeers[seedingChannelId].wire.paidStreamingExtension.isForceChoking).toEqual(
          true
        );
        done();
      });
      leecherA.add(seededTorrent.magnetURI, {store: MemoryChunkStore});
    });
  });

  it('should be able to unchoke and finish a download', async done => {
    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({seedingChannelId}) => {
        seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({torrentPeers, seedingChannelId}) => {
          expect(torrentPeers[seedingChannelId].wire.paidStreamingExtension.isForceChoking).toEqual(
            true
          );
        });
        togglePeerByChannel(seeder, seededTorrent.infoHash, seedingChannelId);

        leecherA.once(ClientEvents.TORRENT_DONE, ({torrent: leechedTorrent}) => {
          expect(seededTorrent.files[0].done).toEqual(leechedTorrent.files[0].done);
          expect(seededTorrent.files[0].length).toEqual(leechedTorrent.files[0].length);
          expect(seededTorrent.files[0].name).toEqual(leechedTorrent.files[0].name);
          done();
        });
      });

      leecherA.add(seededTorrent.magnetURI, {store: MemoryChunkStore});
    });
  });

  it('should support multiple leechers finishing their downloads', async done => {
    const knownPeers = new Set();

    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      seeder.on(ClientEvents.PEER_STATUS_CHANGED, ({peerAccount, seedingChannelId}) => {
        // Make sure we toggle peers only twice
        if (!knownPeers.has(peerAccount)) {
          knownPeers.add(peerAccount);
          togglePeerByChannel(seeder, seededTorrent.infoHash, seedingChannelId);
        }
      });
      leecherA.add(seededTorrent.magnetURI, {store: MemoryChunkStore});
      leecherB.add(seededTorrent.magnetURI, {store: MemoryChunkStore});
    });

    let finishCount = 0;
    async function downloadFinished() {
      finishCount += 1;
      if (finishCount == 2) {
        done();
      }
    }

    leecherA.once(ClientEvents.TORRENT_DONE, downloadFinished);
    leecherB.once(ClientEvents.TORRENT_DONE, downloadFinished);
  });

  afterEach(() => {
    seeder.destroy();
    leecherA.destroy();
    leecherB.destroy();
  });
});
