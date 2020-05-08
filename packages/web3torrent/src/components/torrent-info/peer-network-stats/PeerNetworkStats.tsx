import React from 'react';
import prettier from 'prettier-bytes';
import './PeerNetworkStats.scss';
import {TorrentUI, IdleStatuses} from '../../../types';

export type PeerNetworkStatsProps = {torrent: TorrentUI};

const PeerNetworkStats: React.FC<PeerNetworkStatsProps> = ({torrent}: PeerNetworkStatsProps) =>
  !IdleStatuses.includes(torrent.status) && (
    <section className="PeerNetworkStats">
      {!torrent.originalSeed && torrent.parsedTimeRemaining && torrent.parsedTimeRemaining + '. '}
      {prettier(torrent.done || !torrent.downloadSpeed ? 0 : torrent.downloadSpeed)}
      /s down, {prettier(!torrent.uploadSpeed ? 0 : torrent.uploadSpeed)}/s up
      <br />
      <strong data-test-selector="numPeers">{torrent.numPeers}</strong> Peers connected
    </section>
  );

export {PeerNetworkStats};
