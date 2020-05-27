import React from 'react';
import prettier from 'prettier-bytes';
import './PeerNetworkStats.scss';
import {TorrentUI, IdleStatuses} from '../../../types';

export type PeerNetworkStatsProps = {torrent: TorrentUI};

const PeerNetworkStats: React.FC<PeerNetworkStatsProps> = ({torrent}: PeerNetworkStatsProps) => {
  const showTimeRemaining = !torrent.originalSeed && torrent.parsedTimeRemaining;
  const numChannels = torrent.wires.filter(
    wire =>
      wire.paidStreamingExtension.leechingChannelId || wire.paidStreamingExtension.seedingChannelId
  ).length;
  return (
    !IdleStatuses.includes(torrent.status) && (
      <section className="PeerNetworkStats">
        {showTimeRemaining && `${torrent.parsedTimeRemaining}. `}
        {prettier(torrent.done || !torrent.downloadSpeed ? 0 : torrent.downloadSpeed)}
        /s down, {prettier(!torrent.uploadSpeed ? 0 : torrent.uploadSpeed)}/s up
        <br />
        <strong data-test-selector="numPeers">{numChannels}</strong> running channel
        {numChannels === 1 ? '' : 's'}
      </section>
    )
  );
};
export {PeerNetworkStats};
