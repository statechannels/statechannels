import {defaultTrackers} from '../constants';

import {RoutePath} from '../routes';
import {generateMagnetURL, parseMagnetURL} from './magnet';

const magnetConstants = {name: 'test.zip', xl: 1398978, cost: '0'};

const instantIOMagnet =
  '#magnet:?xt=urn:btih:148c62a7f7845c91e7d16ca9be85de6fbaed3a1f&dn=test.zip&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com';

const mockMagnetGenerator: ({
  name,
  xl,
  cost,
  withTrackers
}: {
  name?: string;
  xl: number;
  cost?: string;
  withTrackers?: boolean;
}) => string = ({name, xl, cost, withTrackers}) =>
  `#magnet:?` +
  `xt=urn%3Abtih%3A148c62a7f7845c91e7d16ca9be85de6fbaed3a1f` +
  `${name !== undefined ? '&dn=' + name : ''}` +
  `${xl !== undefined ? '&xl=' + xl : ''}` +
  `${cost !== undefined ? '&cost=' + cost : ''}` +
  `${withTrackers ? defaultTrackers.map(tr => '&tr=' + tr).join('') : ''}`;

describe('Magnet Parsing', () => {
  it('can parse a Web3Torrent Magnet', () => {
    const result = parseMagnetURL(mockMagnetGenerator(magnetConstants));

    expect(result.name).toBe(magnetConstants.name);
    expect(result.length).toBe(magnetConstants.xl);
    expect(result.cost).toBe(magnetConstants.cost);
  });

  it('can parse an Instant.io Magnet', () => {
    const result = parseMagnetURL(instantIOMagnet);

    expect(result.name).toBe(magnetConstants.name);
    expect(result.length).toBe(0);
    expect(result.cost).toBe('0');
  });

  it('can parse an Instant.io Magnet', () => {
    const result = parseMagnetURL(mockMagnetGenerator({xl: magnetConstants.xl}));

    expect(result.length).toBe(magnetConstants.xl);
  });

  it('can parse an empty magnet (no results)', () => {
    const result = parseMagnetURL('');
    expect(result.magnetURI).toBe('');
  });

  it('can parse an invalid magnet (no results)', () => {
    const result = parseMagnetURL('#magnet');
    expect(result.magnetURI).toBe('');
  });
});

describe('Magnet Generation', () => {
  it('can parse a Web3Torrent Magnet', () => {
    const originalMagnet = mockMagnetGenerator(magnetConstants);
    const parsedTorrent = parseMagnetURL(mockMagnetGenerator(magnetConstants));
    const result = generateMagnetURL(parsedTorrent);
    expect(result).toBe(RoutePath.File + originalMagnet);
  });

  it('does not break when the magnet is empty', () => {
    const parsedTorrent = parseMagnetURL('');
    const result = generateMagnetURL(parsedTorrent);
    expect(result).toBe('http://localhost');
  });

  it('does not break when the magnet is not a Web3Torrent Magnet', () => {
    const parsedTorrent = parseMagnetURL(instantIOMagnet);
    const result = generateMagnetURL(parsedTorrent);
    expect(result).toBe(
      RoutePath.File + mockMagnetGenerator({name: magnetConstants.name, xl: 0, cost: '0'})
    );
  });
});
