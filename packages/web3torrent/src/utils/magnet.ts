import {defaultTrackers, EmptyTorrent} from '../constants';
import {RoutePath} from '../routes';
import {Torrent} from '../types';
import {useLocation} from 'react-router-dom';

/**
 * Custom Hook that retrieves the queryParams of the URL.
 *
 * This is the recommended approach by the React Router:
 * https://reacttraining.com/react-router/web/example/query-parameters
 */
export const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

/**
 * Parses the URL from the page, and creates the information necessary in the UI and to start the download.
 * @param infoHash the id of the torrent
 * @param queryParams extra information for the UI, not necessary, but usefull.
 */
export function parseURL(infoHash: string, queryParams: URLSearchParams): Torrent {
  if (!infoHash || !infoHash.trim()) {
    return EmptyTorrent;
  }
  const name = queryParams.get('name') || 'unknown';
  const length = Number(queryParams.get('length')) || 0;
  const magnetURI = buildMagnetURI(name, length, infoHash);
  return {...EmptyTorrent, infoHash, name, length, magnetURI};
}

export function buildMagnetURI(name: string, length: number, infoHash: string): string {
  return defaultTrackers.reduce(
    (magnetURI, tracker) => magnetURI + '&tr=' + tracker,
    `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}&xl=${length}`
  );
}

export function generateURL({infoHash, length, name}: Torrent): string {
  return `${RoutePath.File}${infoHash}?name=${encodeURIComponent(name)}&length=${length}`;
}
