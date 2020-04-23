import {download, upload, web3torrent} from '../clients/web3torrent-client';
import {useEffect} from 'react';

import React from 'react';
import {getTorrentUI} from '../utils/torrent-status-checker';

export const TorrentContext = React.createContext<ReturnType<typeof useTorrentContext>>(undefined);

export function useTorrentContext({initializationContext}) {
  const {initialize, isInitialized} = initializationContext;

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  });
  // TODO: We should probably just move web3-torrent-client logic here
  return {
    download,
    upload,
    getTorrentUI: data => getTorrentUI(web3torrent, data)
  };
}
