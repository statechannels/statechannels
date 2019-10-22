import WebTorrent, {Torrent, TorrentOptions} from 'webtorrent';
import {PaidStreamingTorrent, WebTorrentAddInput, WebTorrentSeedInput} from '../library/types';
import {TorrentCallback} from '../library/web3torrent-lib';
import {Status} from '../types';
import {createMockTorrent, createMockTorrentPeers} from '../utils/test-utils';
import {download, getTorrentPeers, remove, upload, web3torrent} from './web3torrent-client';

describe('Web3TorrentClient', () => {
  describe('download()', () => {
    let torrent: Partial<Torrent>;
    let addSpy: jest.SpyInstance<
      PaidStreamingTorrent,
      [
        WebTorrentAddInput,
        (WebTorrent.TorrentOptions | TorrentCallback | undefined)?,
        (TorrentCallback | undefined)?
      ]
    >;

    beforeEach(() => {
      torrent = createMockTorrent();
      addSpy = jest
        .spyOn(web3torrent, 'add')
        .mockImplementation(
          (_: WebTorrentAddInput, callback: TorrentOptions | TorrentCallback | undefined) => {
            return (callback as TorrentCallback)(torrent as PaidStreamingTorrent);
          }
        );
    });

    it('should return a torrent with a status of Connecting', async () => {
      const {magnetURI} = torrent;

      const result = await download(magnetURI as WebTorrentAddInput);

      expect(addSpy).toHaveBeenCalled();
      expect(result.magnetURI).toEqual(magnetURI);
      expect(result.status).toEqual(Status.Connecting);
    });

    afterEach(() => {
      addSpy.mockRestore();
    });
  });

  describe('upload()', () => {
    let torrent: Partial<Torrent>;
    let seedSpy: jest.SpyInstance<
      PaidStreamingTorrent,
      [
        WebTorrentSeedInput,
        (WebTorrent.TorrentOptions | TorrentCallback | undefined)?,
        (TorrentCallback | undefined)?
      ]
    >;

    beforeEach(() => {
      torrent = createMockTorrent();
      seedSpy = jest
        .spyOn(web3torrent, 'seed')
        .mockImplementation(
          (_: WebTorrentSeedInput, callback: TorrentOptions | TorrentCallback | undefined) => {
            return (callback as TorrentCallback)(torrent as PaidStreamingTorrent);
          }
        );
    });

    it('should return a torrent with a status of Seeding', async () => {
      const mockBuffer = Buffer.from(new Array(torrent.length)).fill(
        Math.ceil(Math.random() * 255)
      );

      const result = await upload(mockBuffer);

      expect(seedSpy).toHaveBeenCalled();
      expect(result.length).toEqual(torrent.length);
      expect(result.status).toEqual(Status.Seeding);
    });

    afterEach(() => {
      seedSpy.mockRestore();
    });
  });

  describe('remove()', () => {
    let removeSpy: jest.SpyInstance<
      void,
      [string | WebTorrent.Torrent | Buffer, (((err: string | Error) => void) | undefined)?]
    >;

    beforeEach(() => {
      removeSpy = jest
        .spyOn(web3torrent, 'remove')
        .mockImplementation(
          (_: string | WebTorrent.Torrent | Buffer, callback?: (err: string) => void) => {
            if (callback) {
              callback('');
            }
          }
        );
    });

    it('should return the ID of the removed client', async () => {
      const mockInfoHash = '124203';
      const result = await remove(mockInfoHash);

      expect(result).toEqual(mockInfoHash);
    });

    afterEach(() => {
      removeSpy.mockRestore();
    });
  });

  describe('getTorrentPeers()', () => {
    const mockInfoHash = '124203';

    beforeEach(() => {
      web3torrent.allowedPeers[mockInfoHash] = createMockTorrentPeers();
    });

    it('should return peers for a given torrent', () => {
      expect(getTorrentPeers(mockInfoHash)).toEqual(web3torrent.allowedPeers[mockInfoHash]);
    });

    afterEach(() => {
      web3torrent.allowedPeers = {};
    });
  });
});
