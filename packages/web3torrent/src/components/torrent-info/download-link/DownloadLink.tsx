import React, {useEffect, useState} from 'react';
import {Torrent} from '../../../types';
import {getFileSavingData, SavingData} from '../../../utils/file-saver';

export type DownloadLinkProps = {torrent: Torrent};

export const DownloadLink: React.FC<DownloadLinkProps> = ({torrent}) => {
  const [file, setFile] = useState({} as SavingData);

  useEffect(() => {
    if (torrent.done) {
      getFileSavingData(torrent.infoHash).then(data => {
        console.log(data);
        setFile(data);
      });
    }
  }, [torrent.done]);

  return (
    <>
      {file.name && (
        <a href={file.content} className="button" download={file.name}>
          Save Download
        </a>
      )}
    </>
  );
};
