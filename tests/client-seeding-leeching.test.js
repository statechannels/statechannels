import WebTorrent, { ClientEvents } from './../src/web3torrent-lib';
import { defaultFile, defaultSeedingOptions, defaultLeechingOptions } from './utils';

describe('Seeding and Leeching', () => {
  let seeder, leecher;
  beforeEach(() => {
    seeder = new WebTorrent({ pseAccount: 3, dht: false });
    seeder.on('error', err => fail(err));
    seeder.on('warning', err => fail(err));

    leecher = new WebTorrent({ pseAccount: 4, dht: false });
    leecher.on('error', err => fail(err));
    leecher.on('warning', err => fail(err));
  });

  it('should be able to unchoke and finish a download', done => {
    seeder.seed(defaultFile, defaultSeedingOptions(), seededTorrent => {
      seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({ peerAccount }) => {
        setTimeout(() => seeder.togglePeer(seededTorrent.infoHash, peerAccount), 5000);
        leecher.once(ClientEvents.TORRENT_DONE, leechedTorrent => {
          expect(seededTorrent.files[0].done).toEqual(leechedTorrent.files[0].done);
          done();
        });
      });
      leecher.add(seededTorrent.magnetURI, defaultLeechingOptions);
    }
    );
  }, 15000);
  
  it('should be able to unchoke and finish a download', done => {
    seeder.seed(defaultFile, defaultSeedingOptions(), seededTorrent => {
      seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({ peerAccount }) => {
        setTimeout(() => seeder.togglePeer(seededTorrent.infoHash, peerAccount), 35000);
        leecher.once(ClientEvents.TORRENT_DONE, leechedTorrent => {
          expect(seededTorrent.files[0].done).toEqual(leechedTorrent.files[0].done);
          done();
        });
      });
      leecher.add(seededTorrent.magnetURI, defaultLeechingOptions);
    }
    );
  }, 45000);
  
  it('should be able to unchoke and finish a download', done => {
    seeder.seed(defaultFile, defaultSeedingOptions(), seededTorrent => {
      seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({ peerAccount }) => {
        setTimeout(() => seeder.togglePeer(seededTorrent.infoHash, peerAccount), 125000);
        leecher.once(ClientEvents.TORRENT_DONE, leechedTorrent => {
          expect(seededTorrent.files[0].done).toEqual(leechedTorrent.files[0].done);
          done();
        });
      });
      leecher.add(seededTorrent.magnetURI, defaultLeechingOptions);
    }
    );
  }, 150000);
  

  afterEach(() => {
    seeder.destroy();
    leecher.destroy();
  });
});
