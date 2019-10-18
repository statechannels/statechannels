import React, {useEffect, useState} from 'react';

import prettier from 'prettier-bytes';
import {Torrent} from '../../../types';
import {FormButton} from '../../form';
import './DownloadInfo.scss';
import {ProgressBar} from './progress-bar/ProgressBar';
export type DownloadInfoProps = {torrent: Torrent};

const DownloadInfo: React.FC<DownloadInfoProps> = ({torrent}: DownloadInfoProps) => {
  const [fileURL, setURL] = useState('');
  useEffect(() => {
    if (torrent.done && torrent.files[0] && torrent.files[0].getBlobURL) {
      torrent.files[0].getBlobURL((_, url) => setURL(url as string));
    }
  }, [torrent.done, torrent.files]);

  return (
    <section className="downloadingInfo">
      <ProgressBar
        downloaded={torrent.downloaded}
        length={torrent.length}
        status={torrent.status}
        infoHash={torrent.infoHash}
      />
      <p>
        {torrent.parsedTimeRemaining}.{' '}
        {prettier(torrent.done || !torrent.downloadSpeed ? 0 : torrent.downloadSpeed)}
        /s down, {prettier(!torrent.uploadSpeed ? 0 : torrent.uploadSpeed)}/s up
        <br />
        Connected to <strong>{torrent.numPeers}</strong> peers.
      </p>
      {torrent.downloaded !== torrent.length ? (
        false
      ) : (
        <a href={fileURL} download={torrent.name}>
          <FormButton name="save-download" onClick={() => null}>
            Save Download
          </FormButton>
        </a>
      )}
    </section>
  );
};

export {DownloadInfo};
