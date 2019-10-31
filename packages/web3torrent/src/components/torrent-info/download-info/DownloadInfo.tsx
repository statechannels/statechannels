import prettier from 'prettier-bytes';
import React from 'react';
import {remove} from '../../../clients/web3torrent-client';
import {Torrent} from '../../../types';
import './DownloadInfo.scss';
import {ProgressBar} from './progress-bar/ProgressBar';

export type DownloadInfoProps = {torrent: Torrent};

const DownloadInfo: React.FC<DownloadInfoProps> = ({torrent}: DownloadInfoProps) => {
  return (
    <section className="downloadingInfo">
      <ProgressBar
        downloaded={torrent.downloaded}
        length={torrent.length}
        status={torrent.status}
      />
      {!torrent.done ? (
        <button type="button" className="button cancel" onClick={() => remove(torrent.infoHash)}>
          Cancel Download
        </button>
      ) : (
        false
      )}
      <p>
        {torrent.parsedTimeRemaining}.{' '}
        {prettier(torrent.done || !torrent.downloadSpeed ? 0 : torrent.downloadSpeed)}
        /s down, {prettier(!torrent.uploadSpeed ? 0 : torrent.uploadSpeed)}/s up
        <br />
        Connected to <strong>{torrent.numPeers}</strong> peers.
      </p>
    </section>
  );
};

export {DownloadInfo};
