import prettier from 'prettier-bytes';
import React from 'react';
import {DownloadingStatuses, Torrent, UploadingStatuses} from '../../types';
import {DownloadInfo} from './download-info/DownloadInfo';
import {DownloadLink} from './download-link/DownloadLink';
import {MagnetLinkButton} from './magnet-link-button/MagnetLinkButton';
import './TorrentInfo.scss';
import {UploadInfo} from './upload-info/UploadInfo';
import {WEI_PER_PIECE} from '../../library/web3torrent-lib';
import {ChannelState} from '../../clients/payment-channel-client';

export type TorrentInfoProps = {
  torrent: Torrent;
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
          <span className="fileName">{torrent.name}</span>
        </div>
        <div className="row">
          <span className="fileSize">
            {torrent.length === 0 ? '? Mb' : prettier(torrent.length)}
          </span>
          {torrent.status && <span className="fileStatus">{torrent.status}</span>}
          <span className="fileCost">
            Cost{' '}
            {torrent.pieces
              ? WEI_PER_PIECE.mul(torrent.pieces.length)
                  .toNumber()
                  .toString() + ' wei'
              : 'unknown'}
          </span>
          {torrent.magnetURI && <MagnetLinkButton />}
        </div>
      </section>
      {DownloadingStatuses.includes(torrent.status) ? (
        <DownloadInfo
          torrent={torrent}
          channelCache={channelCache}
          mySigningAddress={mySigningAddress}
        />
      ) : (
        UploadingStatuses.includes(torrent.status) && (
          <UploadInfo
            torrent={torrent}
            channelCache={channelCache}
            mySigningAddress={mySigningAddress}
          />
        )
      )}
      {!torrent.originalSeed && <DownloadLink torrent={torrent} />}
    </>
  );
};

export {TorrentInfo};
