import WebTorrentPaidStreamingClient from './../src/web3torrent-lib';
import { defaultFile, defaultFileMagnetURI, defaultSeedingOptions, defaultTorrentHash } from './utils';

describe('Base Seeding', () => {
  it('Seed and remove a Torrent', done => {
    expect.assertions(7);
    const client = new WebTorrentPaidStreamingClient({ dht: false });
    expect(client.pseAccount).not.toBeNaN();

    client.on('error', err => fail(err));
    client.on('warning', err => fail(err));

    client.seed(defaultFile as File, defaultSeedingOptions(false), torrent => {
      expect(client.torrents.length).toEqual(1);
      expect(torrent.infoHash).toEqual(defaultTorrentHash);
      expect(torrent.magnetURI).toEqual(defaultFileMagnetURI);

      client.remove(torrent, err => {
        expect(err).toBeFalsy();
        expect(client.torrents.length).toEqual(0);
        client.destroy(err => {
          expect(err).toBeFalsy();
          done();
        });
      });
    });
  });
});
