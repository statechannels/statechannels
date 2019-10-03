import React from 'react';
import {Torrent} from '../../types';
import {DownloadInfo} from './download-info/DownloadInfo';
import './TorrentInfo.scss';
import {UploadInfo} from './upload-info/UploadInfo';

export type TorrentInfoProps = {torrent: Torrent};

const TorrentInfo: React.FC<TorrentInfoProps> = ({torrent}: TorrentInfoProps) => {
  return (
    <>
      <section className={`torrentInfo ${torrent.magnetURI ? ' with-link' : ''}`}>
        <span className="fileName">{torrent.name}</span>
        <span className="fileSize">{torrent.length}Mb</span>
        {torrent.status ? <span className="fileStatus">{torrent.status}</span> : false}
        <span className="fileCost">Est. cost ${Number(torrent.cost).toFixed(2)}</span>
        {torrent.magnetURI ? (
          <a href={torrent.magnetURI} className="fileLink">
            Share Link
          </a>
        ) : (
          false
        )}
      </section>
      {torrent.downloaded ? <DownloadInfo torrent={torrent} /> : false}
      {torrent.uploaded ? <UploadInfo torrent={torrent} /> : false}
    </>
  );
};

export {TorrentInfo};
