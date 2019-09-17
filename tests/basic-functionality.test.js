import fixtures from 'webtorrent-fixtures';
import WebTorrent from './../src/web3torrent-lib';

describe('Base Seeding', () => {
  it('Seed and remove a Torrent', done => {
    if (typeof Blob === 'undefined') return t.end();
    expect.assertions(7);
    const client = new WebTorrent({ dht: false });
    expect(client.pseAccount).not.toBeNaN();
    client.on('error', err => {
      fail(err);
    });
    client.on('warning', err => {
      fail(err);
    });
    client.seed(
      new Blob([fixtures.leaves.content]),
      { name: 'Leaves of Grass by Walt Whitman.epub', announce: [process.env.TRACKER_URL] },
      torrent => {
        expect(client.torrents.length).toEqual(1);
        expect(torrent.infoHash).toEqual(fixtures.leaves.parsedTorrent.infoHash);
        expect(torrent.magnetURI).toEqual(
          `${fixtures.leaves.magnetURI}&tr=${encodeURIComponent(process.env.TRACKER_URL)}`
        );

        client.remove(torrent, err => {
          expect(err).toBeFalsy();
          expect(client.torrents.length).toEqual(0);
          client.destroy(err => {
            expect(err).toBeFalsy();
            done();
          });
        });
      }
    );
  });

  it;
});
