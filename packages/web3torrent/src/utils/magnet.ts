import {defaultTrackers, EmptyTorrent} from '../constants';
import {RoutePath} from '../routes';
import {Torrent} from '../types';
import {useLocation} from 'react-router-dom';

export const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

export const parseURL: (infoHash: string, queryParams: any) => Torrent = (
  infoHash,
  queryParams
) => {
  if (!infoHash || !infoHash.trim()) {
    return EmptyTorrent;
  }
  const name = queryParams.get('name') || queryParams.get('dn') || 'unknown';
  const length = Number(queryParams.get('length')) || 0;
  const magnetURI = buildMagnetURI(name, length, infoHash, defaultTrackers);
  return {...EmptyTorrent, infoHash, name, length, magnetURI};
};

const buildMagnetURI = (name = 'unknown', length = 0, infoHash, trackers) => {
  const parameters = new URLSearchParams(`?xt=urn:btih:${infoHash}&dn=${name}&xl=${length}`);
  trackers.map(tr => parameters.append('tr', tr));
  return decodeURIComponent(`magnet:?${parameters.toString()}`);
};

export const generateURL = ({magnetURI, infoHash, files, length, name}: Torrent) => {
  if (!magnetURI) {
    return window.location.origin;
  }
  return `${RoutePath.File}${infoHash}?name=${encodeURIComponent(name)}&length=${length}`;
};
