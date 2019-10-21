import {defaultTrackers, EmptyTorrent} from '../constants';
import {Torrent} from '../types';

export const parseMagnetURL: (rawMagnetURL: string) => Torrent = (rawMagnetURL = '') => {
  const emptyTorrentData = {...EmptyTorrent, magnetURI: ''} as Torrent;
  if (!rawMagnetURL.trim()) {
    return emptyTorrentData;
  }
  const magnetParams = new URLSearchParams(rawMagnetURL.trim().replace(/#magnet:/g, ''));
  if (!magnetParams.has('xt')) {
    return emptyTorrentData;
  }

  if (!magnetParams.has('tr')) {
    defaultTrackers.map(tr => magnetParams.append('tr', tr));
  }

  return {
    ...emptyTorrentData,
    name: magnetParams.get('name') || magnetParams.get('dn') || 'unknown',
    magnetURI: decodeURIComponent(`magnet:?${magnetParams.toString()}`),
    length: Number(magnetParams.get('xl')) || 0,
    cost: magnetParams.get('cost') || '0'
  };
};

export const generateMagnetURL = (torrent: Torrent) => {
  if (!torrent.magnetURI) {
    return window.location.origin;
  }
  const magnetParams = new URLSearchParams(torrent.magnetURI.replace(/magnet:/g, ''));
  magnetParams.delete('tr');
  magnetParams.append('xl', String(torrent.length));
  if (torrent.cost) {
    magnetParams[!magnetParams.has('cost') ? 'append' : 'set']('cost', torrent.cost);
  }
  magnetParams[!magnetParams.has('xl') ? 'append' : 'set']('xl', String(torrent.length));

  return `${window.location.origin}/download/magnet#magnet:?${magnetParams.toString()}`;
};
