import React, {useEffect, useState} from 'react';
import {Torrent} from '../../../types';
import {getFileSavingData, SavingData} from '../../../utils/file-saver';

export type DownloadLinkProps = {torrent: Torrent};

export const DownloadLink: React.FC<DownloadLinkProps> = ({torrent}) => {
  const [file, setFile] = useState({} as SavingData);
  useEffect(() => {
    if (torrent.done) {
      getFileSavingData(torrent.files).then(data => setFile(data));
    }
  }, [torrent.done, torrent.files]);

  return (
    <>
      {torrent.done && (
        <a href={file.content} className="button" download={file.name || torrent.name}>
          Save Download
        </a>
      )}
    </>
  );
};
