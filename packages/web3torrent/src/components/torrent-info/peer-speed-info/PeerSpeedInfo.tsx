import React from 'react';
import prettier from 'prettier-bytes';
import './PeerSpeedInfo.scss';
import {TorrentUI, IdleStatuses} from '../../../types';

export type PeerSpeedInfoProps = {torrent: TorrentUI};

const PeerSpeedInfo: React.FC<PeerSpeedInfoProps> = ({torrent}: PeerSpeedInfoProps) =>
  !IdleStatuses.includes(torrent.status) && (
    <section className="peerSpeedInfo">
      {!torrent.originalSeed && torrent.parsedTimeRemaining && torrent.parsedTimeRemaining + '. '}
      {prettier(torrent.done || !torrent.downloadSpeed ? 0 : torrent.downloadSpeed)}
      /s down, {prettier(!torrent.uploadSpeed ? 0 : torrent.uploadSpeed)}/s up
      <br />
      <strong data-test-selector="numPeers">{torrent.numPeers}</strong> Peers connected
    </section>
  );

export {PeerSpeedInfo};
