import {web3TorrentClient} from '../clients/web3torrent-client';
import {Status, TorrentStaticData} from '../types';
import {infoHash, createMockExtendedTorrent} from './test-utils';
import {getFormattedETA, getStatus, getTorrentUI} from './torrent-status-checker';
import {mockMetamask} from '../library/testing/test-utils';
import {getStaticTorrentUI} from '../constants';
import {ExtendedTorrent} from '../library/types';
import WebTorrent from 'webtorrent';

describe('Torrent Status Checker', () => {
  let torrent: ExtendedTorrent;

  const staticData: TorrentStaticData = {
    infoHash: infoHash
  };

  beforeAll(() => {
    mockMetamask();
    web3TorrentClient.enable(); // without this step, we do not yet have a pseAccount and tests will fail accordingly
  });
  beforeEach(() => {
    torrent = createMockExtendedTorrent();
  });
  afterAll(() => {
    web3TorrentClient.destroy();
  });

  describe('Main function', () => {
    it('should return a torrent with a status of Idle when the torrent is not live', () => {
      const getSpy = jest.spyOn(web3TorrentClient, 'get').mockImplementation(() => undefined);

      const result = getTorrentUI(web3TorrentClient, staticData);

      expect(getSpy).toHaveBeenCalledWith(infoHash);
      expect(result).toEqual(getStaticTorrentUI(staticData.infoHash));

      getSpy.mockRestore();
    });

    it("should return a torrent with a valid status if it's a live torrent", () => {
      expect(process.env.FAKE_CHANNEL_PROVIDER).toBe('true');
      const inProgressTorrent: Partial<ExtendedTorrent> = {
        downloaded: 12891.3,
        uploaded: 0,
        uploadSpeed: 3000,
        downloadSpeed: 10000,
        numPeers: 2,
        done: false,
        timeRemaining: 50000,
        paused: undefined,
        wires: []
      };

      const getSpy = jest.spyOn(web3TorrentClient, 'get').mockImplementation(() => ({
        ...torrent,
        ...inProgressTorrent
      }));

      const result = getTorrentUI(web3TorrentClient, staticData);
      const expectedResult = {
        ...torrent,
        ...inProgressTorrent,
        originalSeed: false,
        status: Status.Downloading,
        parsedTimeRemaining: 'ETA 50s'
      };
      delete expectedResult.timeRemaining;
      delete expectedResult.createdBy;

      expect(result).toEqual(expectedResult);

      getSpy.mockRestore();
    });
  });

  describe('Subcomponents', () => {
    describe('getFormattedETA()', () => {
      it("should return 'Done' if the torrent's done", () => {
        expect(getFormattedETA(true, 0)).toEqual('Done');
      });

      it("should return 'ETA 0s' if timeRemaining is empty", () => {
        expect(getFormattedETA(false, 0)).toEqual('ETA 0s');
      });

      it("should return 'ETA Unknown' if timeRemaining is Infinity", () => {
        expect(getFormattedETA(false, Infinity)).toEqual('ETA Unknown');
      });

      it('should return time in seconds', () => {
        expect(getFormattedETA(false, 5325)).toEqual('ETA 5s');
      });

      it('should return time in minutes and seconds', () => {
        expect(getFormattedETA(false, 121220)).toEqual('ETA 2m 1s');
      });

      it('should return time in hours and minutes', () => {
        expect(getFormattedETA(false, 25923813)).toEqual('ETA 7h 12m');
      });

      it('should return time in days, hours and minutes', () => {
        expect(getFormattedETA(false, 482949274)).toEqual('ETA 5d 14h 9m');
      });
    });
    describe('getStatus()', () => {
      it('should return Seeding if the torrent is now Seeding', () => {
        expect(
          getStatus(
            {
              createdBy: web3TorrentClient.pseAccount,
              uploadSpeed: 1000,
              downloadSpeed: 0,
              progress: 50,
              done: false
            } as WebTorrent.Torrent,
            web3TorrentClient.pseAccount
          )
        ).toEqual(Status.Seeding);
      });

      it('should return Completed if the torrent is done', () => {
        expect(
          getStatus(
            {
              uploadSpeed: 1000,
              downloadSpeed: 1000,
              progress: 100,
              done: true
            } as WebTorrent.Torrent,
            web3TorrentClient.pseAccount
          )
        ).toEqual(Status.Completed);
      });

      it('should return Connecting if there is no traffic yet', () => {
        expect(
          getStatus(
            {uploadSpeed: 0, downloadSpeed: 0, progress: 0, done: false} as WebTorrent.Torrent,
            web3TorrentClient.pseAccount
          )
        ).toEqual(Status.Connecting);
      });

      it('should return Downloading for any other cases', () => {
        expect(
          getStatus(
            {
              uploadSpeed: 0,
              downloadSpeed: 1000,
              progress: 10,
              done: false
            } as WebTorrent.Torrent,
            web3TorrentClient.pseAccount
          )
        ).toEqual(Status.Downloading);
      });
    });
  });
});
