import React from 'react';
import './DownloadInfo.scss';
import {ProgressBar} from './progress-bar/ProgressBar';
import {TorrentUI} from '../../../types';

export type DownloadInfoProps = {torrent: TorrentUI};

export const DownloadInfo: React.FC<DownloadInfoProps> = ({torrent}: DownloadInfoProps) => {
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
