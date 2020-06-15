import React, {useEffect, useState} from 'react';
import {getFileSavingData, SavingData} from '../../../utils/file-saver';

import './DownloadLink.scss';
import {TorrentUI} from '../../../types';
import {track} from '../../../segment-analytics';

export type DownloadLinkProps = {torrent: TorrentUI};

export const DownloadLink: React.FC<DownloadLinkProps> = ({torrent}) => {
  const [file, setFile] = useState({} as SavingData);
  useEffect(() => {
    if (torrent.done && !torrent.originalSeed) {
      getFileSavingData(torrent.files, torrent.name).then(data => setFile(data));
    }
  }, [torrent.done, torrent.files, torrent.name, torrent.originalSeed]);

  const trackDownload = () => {
    track('File Downloaded', {
      filename: file.name
    });
    return true; // necessary to ensure href is triggered
  };

  return (
    <>
      {torrent.done && !torrent.originalSeed && (
        <a
          href={file.content}
          onClick={trackDownload}
          className="DownloadLink button"
          download={file.name || torrent.name}
        >
          Save Download
        </a>
      )}
    </>
  );
};
