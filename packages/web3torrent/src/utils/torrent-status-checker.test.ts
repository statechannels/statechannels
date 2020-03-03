import {web3torrent} from '../clients/web3torrent-client';
import {Status, Torrent} from '../types';
import {createMockTorrent} from './test-utils';
import checkTorrentStatus, {getFormattedETA, getStatus} from './torrent-status-checker';

describe('Torrent Status Checker', () => {
  let torrent: Torrent;
  const mockInfoHash = '123';

  beforeAll(() => {
    web3torrent.enable(); // without this step, we do not yet have a pseAccount and tests will fail accordingly
  });
  beforeEach(() => {
    torrent = createMockTorrent() as Torrent;
  });

  describe('Main function', () => {
    it('should return a torrent with a status of Idle when no info hash exists', () => {
      expect(checkTorrentStatus(torrent, undefined)).toEqual({
        ...torrent,
        status: Status.Idle
      } as Torrent);
    });

    it('should return a torrent with a status of Idle when the torrent is no longer live', () => {
      const getSpy = jest.spyOn(web3torrent, 'get').mockImplementation(_ => undefined);

      const result = checkTorrentStatus(torrent, mockInfoHash);

      expect(getSpy).toHaveBeenCalledWith(mockInfoHash);
      expect(result).toEqual({
        ...torrent,
        status: Status.Idle
      } as Torrent);

      getSpy.mockRestore();
    });

    it("should return a torrent with a valid status if it's a live torrent", () => {
      const inProgressTorrent: Partial<Torrent> = {
        downloaded: 12891.3,
        uploadSpeed: 3000,
        downloadSpeed: 10000,
        numPeers: 2,
        done: false,
        timeRemaining: 50000,
        originalSeed: false
      };

      const getSpy = jest.spyOn(web3torrent, 'get').mockImplementation(_ => ({
        ...torrent,
        ...inProgressTorrent
      }));

      const result = checkTorrentStatus(torrent, mockInfoHash);

      expect(result).toEqual({
        ...torrent,
        ...inProgressTorrent,
        status: Status.Downloading,
        parsedTimeRemaining: 'ETA 50s'
      });

      getSpy.mockRestore();
    });
  });

  describe('Subcomponents', () => {
    describe('getFormattedETA()', () => {
      it("should return 'Done' if the torrent's done", () => {
        expect(getFormattedETA({done: true} as Torrent)).toEqual('Done');
      });

      it("should return 'ETA 0s' if timeRemaining is empty", () => {
        expect(getFormattedETA({done: false} as Torrent)).toEqual('ETA 0s');
      });

      it("should return 'ETA Unknown' if timeRemaining is Infinity", () => {
        expect(getFormattedETA({done: false, timeRemaining: Infinity} as Torrent)).toEqual(
          'ETA Unknown'
        );
      });

      it('should return time in seconds', () => {
        expect(getFormattedETA({done: false, timeRemaining: 5325} as Torrent)).toEqual('ETA 5s');
      });

      it('should return time in minutes and seconds', () => {
        expect(getFormattedETA({done: false, timeRemaining: 121220} as Torrent)).toEqual(
          'ETA 2m 1s'
        );
      });

      it('should return time in hours and minutes', () => {
        expect(getFormattedETA({done: false, timeRemaining: 25923813} as Torrent)).toEqual(
          'ETA 7h 12m'
        );
      });

      it('should return time in days, hours and minutes', () => {
        expect(getFormattedETA({done: false, timeRemaining: 482949274} as Torrent)).toEqual(
          'ETA 5d 14h 9m'
        );
      });
    });
    describe('getStatus()', () => {
      it('should return Seeding if the torrent is now Seeding', () => {
        expect(
          getStatus({
            createdBy: web3torrent.pseAccount,
            uploadSpeed: 1000,
            downloadSpeed: 0,
            progress: 50,
            done: false
          } as Torrent)
        ).toEqual(Status.Seeding);
      });

      it('should return Completed if the torrent is done', () => {
        expect(
          getStatus({
            uploadSpeed: 1000,
            downloadSpeed: 1000,
            progress: 100,
            done: true
          } as Torrent)
        ).toEqual(Status.Completed);
      });

      it('should return Connecting if there is no traffic yet', () => {
        expect(
          getStatus({uploadSpeed: 0, downloadSpeed: 0, progress: 0, done: false} as Torrent)
        ).toEqual(Status.Connecting);
      });

      it('should return Downloading for any other cases', () => {
        expect(
          getStatus({
            uploadSpeed: 0,
            downloadSpeed: 1000,
            progress: 10,
            done: false
          } as Torrent)
        ).toEqual(Status.Downloading);
      });
    });
  });
});
