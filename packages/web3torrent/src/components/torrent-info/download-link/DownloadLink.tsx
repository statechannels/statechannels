import React, {useEffect, useState} from 'react';
import {Torrent} from '../../../types';

export type DownloadLinkProps = {torrent: Torrent};

export const DownloadLink: React.FC<DownloadLinkProps> = ({torrent}) => {
  const [fileURL, setURL] = useState('');

  useEffect(() => {
    if (torrent.done && torrent.files[0] && torrent.files[0].getBlobURL) {
      torrent.files[0].getBlobURL((_, url) => setURL(url as string));
    }
  }, [torrent.done, torrent.files]);

  return (
    <>
      {fileURL && (
        <a href={fileURL} className="button" download={torrent.name}>
          Save Download
        </a>
      )}
    </>
  );
};
