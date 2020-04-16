import {EmptyTorrent} from '../constants';
import {TorrentPeers} from '../library/types';
import {Torrent} from '../types';

export const infoHash = '0303b8f867f4377ef4a25eba8836cc5f7fdd992b';

export function testSelector(name: string): string {
  return `[data-test-selector='${name}']`;
}
export function createMockTorrent(props?: Partial<Torrent>): Torrent {
  return {
    ...EmptyTorrent,
    infoHash,
    magnetURI:
      'magnet:?xt=urn%3Abtih%3A0303b8f867f4377ef4a25eba8836cc5f7fdd992b&dn=on-the-shortness-of-life-1.jpg&xl=128864&cost=0',
    name: 'on-the-shortness-of-life-1.jpg',
    downloaded: 0,
    length: 128913,
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
      beneficiaryBalance: '50',
      channelId: '0x0000000000000000000000000000001231927371',
      buffer: '50',
      uploaded: 4225
    },
    '5589113806923374': {
      id: '5589113806923374',
      allowed: true,
      buffer: '50',
      beneficiaryBalance: '50',
      wire: {
        uploaded: 52923
      },
      channelId: '0x0000000000000000000000000000001231927371',
      uploaded: 52923
    }
  };
}
