import prettier from 'prettier-bytes';
import React from 'react';
import {DownloadingStatuses, TorrentUI} from '../../types';
import {DownloadInfo} from './download-info/DownloadInfo';
import {DownloadLink} from './download-link/DownloadLink';
import {MagnetLinkButton} from './magnet-link-button/MagnetLinkButton';
import './TorrentInfo.scss';
import {UploadInfo} from './upload-info/UploadInfo';
import {calculateWei, prettyPrintWei} from '../../utils/calculateWei';
import {ChannelState} from '../../clients/payment-channel-client';
import {FaFileDownload, FaFileUpload} from 'react-icons/fa';

export type TorrentInfoProps = {
  torrent: TorrentUI;
  channelCache: Record<string, ChannelState>;
  mySigningAddress: string;
};

const TorrentInfo: React.FC<TorrentInfoProps> = ({
  torrent,
  channelCache = {},
  mySigningAddress
}) => {
  return (
    <>
      <section className="torrentInfo">
        <div className="row">
          <span className="fileName">
            {torrent.originalSeed ? (
              <FaFileUpload className="fileIcon" />
            ) : (
              <FaFileDownload className="fileIcon" />
            )}
            {torrent.name}
          </span>
        </div>
        <div className="row">
          <span className="fileSize">
            Size: {torrent.length === 0 ? '? Mb' : prettier(torrent.length)}
          </span>
          <span className="fileCost">
            Cost: {torrent.length ? prettyPrintWei(calculateWei(torrent.length)) : 'unknown'}
          </span>
          {torrent.status && <span className="fileStatus">Status: {torrent.status}</span>}
          {torrent.magnetURI && <MagnetLinkButton />}
        </div>
      </section>
      {DownloadingStatuses.includes(torrent.status) && !torrent.originalSeed && (
        <DownloadInfo
          torrent={torrent}
          channelCache={channelCache}
          mySigningAddress={mySigningAddress}
        />
      )}
      <UploadInfo
        torrent={torrent}
        channelCache={channelCache}
        mySigningAddress={mySigningAddress}
      />
      {!torrent.originalSeed && <DownloadLink torrent={torrent} />}
    </>
  );
};

export {TorrentInfo};
