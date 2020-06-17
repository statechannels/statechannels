import React, {useContext} from 'react';
import './DownloadInfo.scss';
import {ProgressBar} from './progress-bar/ProgressBar';
import {TorrentUI} from '../../../types';
import {Web3TorrentClientContext} from '../../../clients/web3torrent-client';
import {track} from '../../../analytics';

export type DownloadInfoProps = {torrent: TorrentUI};

export const DownloadInfo: React.FC<DownloadInfoProps> = ({torrent}: DownloadInfoProps) => {
  const web3torrent = useContext(Web3TorrentClientContext);
  return (
    <section className="downloadingInfo">
      {!(torrent.done || torrent.paused) && (
        <>
          <ProgressBar
            downloaded={torrent.downloaded}
            length={torrent.length}
            status={torrent.status}
          />
        </>
      )}
    </section>
  );
};
