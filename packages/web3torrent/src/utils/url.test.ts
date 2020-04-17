import {RoutePath} from '../routes';
import {generateURL} from './url';
import {createMockTorrentUI} from './test-utils';
import {getStaticTorrentUI} from '../constants';

const mockTorrent = createMockTorrentUI();
const mockOptionalParams = ({name, xl}) =>
  new URLSearchParams(
    `?${name !== undefined ? 'name=' + name : ''}` + `${xl !== undefined ? '&length=' + xl : ''}`
  );

describe('URL Parsing', () => {
  it('can parse a Web3Torrent Magnet', () => {
    const result = getStaticTorrentUI(mockTorrent.infoHash, mockTorrent.name, mockTorrent.length);
    expect(result.name).toBe(mockTorrent.name);
    expect(result.length).toBe(mockTorrent.length);
  });

  it('can parse an torrent with no extra data', () => {
    const result = getStaticTorrentUI(mockTorrent.infoHash);
    expect(result.infoHash).toBe(mockTorrent.infoHash);
    expect(result.name).toBe('unknown');
    expect(result.length).toBe(0);
  });
});

describe('URL Generation', () => {
  it('can generate a Web3Torrent Magnet', () => {
    const result = generateURL(mockTorrent);
    expect(result).toBe(
      `${RoutePath.File}${mockTorrent.infoHash}?${mockOptionalParams({
        name: mockTorrent.name,
        xl: mockTorrent.length
      })}`
    );
  });
});
