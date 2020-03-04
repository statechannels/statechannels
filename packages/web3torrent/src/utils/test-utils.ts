import {EmptyTorrent} from '../constants';
import {TorrentPeers} from '../library/types';
import {Torrent} from '../types';

export function testSelector(name: string): string {
  return `[data-test-selector='${name}']`;
}
export function createMockTorrent(props?: Partial<Torrent>): Torrent {
  return {
    ...EmptyTorrent,
    magnetURI:
      'magnet:?xt=urn%3Abtih%3A0303b8f867f4377ef4a25eba8836cc5f7fdd992b&dn=on-the-shortness-of-life-1.jpg&xl=128864&cost=0',
    name: 'on-the-shortness-of-life-1.jpg',
    downloaded: 0,
    length: 128913,
    cost: '1.34',
    ready: true,
    ...props
  };
}

export function createMockTorrentPeers(): TorrentPeers {
  return {
    '7595267661936611': {
      id: '7595267661936611',
      allowed: true,
      wire: {
        uploaded: 4225
      },
      buffer: '50',
      seederBalance: '50'
    },
    '5589113806923374': {
      id: '5589113806923374',
      allowed: true,
      buffer: '50',
      seederBalance: '50',
      wire: {
        uploaded: 52923
      }
    }
  };
}
