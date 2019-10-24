import prettier from 'prettier-bytes';
import React from 'react';
import {TorrentPeers} from '../../library/types';
import {Status, Torrent} from '../../types';
import {DownloadInfo} from './download-info/DownloadInfo';
import {DownloadLink} from './download-link/DownloadLink';
import {MagnetLinkButton} from './magnet-link-button/MagnetLinkButton';
import './TorrentInfo.scss';
import {UploadInfo} from './upload-info/UploadInfo';

export type TorrentInfoProps = {torrent: Torrent; peers?: TorrentPeers};
const DownloadingStatuses = [Status.Connecting, Status.Downloading, Status.Completed];
const UploadingStatuses = [Status.Seeding];

const TorrentInfo: React.FC<TorrentInfoProps> = ({torrent, peers}) => {
  return (
    <>
      <section className={`torrentInfo ${torrent.magnetURI ? ' with-link' : ''}`}>
        <span className="fileName">{torrent.name}</span>
        <span className="fileSize">{torrent.length === 0 ? '? Mb' : prettier(torrent.length)}</span>
        {torrent.status && <span className="fileStatus">{torrent.status}</span>}
        <span className="fileCost">
          Est. cost {!torrent.cost ? 'Unknown' : `$${Number(torrent.cost).toFixed(2)}`}
        </span>
        {torrent.magnetURI && <MagnetLinkButton torrent={torrent} />}
      </section>
      {DownloadingStatuses.includes(torrent.status) ? (
        <DownloadInfo torrent={torrent} />
      ) : (
        UploadingStatuses.includes(torrent.status) && <UploadInfo torrent={torrent} peers={peers} />
      )}
      {!torrent.createdBy && <DownloadLink torrent={torrent} />}
    </>
  );
};

export {TorrentInfo};
