import {RoutePath} from '../routes';
import {useLocation} from 'react-router-dom';
import {ExtendedTorrent} from '../library/types';

/**
 * Custom Hook that retrieves the queryParams of the URL.
 *
 * This is the recommended approach by the React Router:
 * https://reacttraining.com/react-router/web/example/query-parameters
 */
export const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

export function generateURL({
  infoHash,
  length,
  name
}: Pick<ExtendedTorrent, 'infoHash' | 'length' | 'name'>): string {
  return `${RoutePath.File}${infoHash}?name=${encodeURIComponent(name)}&length=${length}`;
}
