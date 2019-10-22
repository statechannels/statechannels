import prettier from 'prettier-bytes';
import React, {useState} from 'react';
import {TorrentPeers} from '../../library/types';
import {Status, Torrent} from '../../types';
import {clipboardCopy} from '../../utils/copy-to-clipboard';
import {generateMagnetURL} from '../../utils/magnet';
import {DownloadInfo} from './download-info/DownloadInfo';
import './TorrentInfo.scss';
import {UploadInfo} from './upload-info/UploadInfo';

export type MagnetLinkButtonProps = {torrent: Torrent};

const MagnetLinkButton: React.FC<MagnetLinkButtonProps> = ({torrent}) => {
  const [magnetInfo, setMagnetInfo] = useState({
    copied: false,
    magnet: generateMagnetURL(torrent)
  });
  return (
    <button
      className="fileLink"
      type="button"
      onClick={() => {
        clipboardCopy(magnetInfo.magnet);
        setMagnetInfo({...magnetInfo, copied: true});
        setTimeout(() => setMagnetInfo({...magnetInfo, copied: false}), 3000);
      }}
    >
      {/* @todo: This shouldn't be called "myTooltip" by ID */}
      <span className={'tooltiptext ' + magnetInfo.copied} id="myTooltip">
        {magnetInfo.copied ? 'Great! Copied to your clipboard' : 'Copy to clipboard'}
      </span>
      Share Link
    </button>
  );
};

export type TorrentInfoProps = {torrent: Torrent; peers?: TorrentPeers};

const TorrentInfo: React.FC<TorrentInfoProps> = ({torrent, peers}) => {
  return (
    <>
      <section className={`torrentInfo ${torrent.magnetURI ? ' with-link' : ''}`}>
        <span className="fileName">{torrent.name}</span>
        {/* @todo Check if webtorrent allows for torrent.length to be undefined */}
        <span className="fileSize">{!torrent.length ? '? Mb' : prettier(torrent.length)}</span>
        {torrent.status ? <span className="fileStatus">{torrent.status}</span> : false}
        <span className="fileCost">
          Est. cost {!torrent.cost ? 'Unknown' : `$${Number(torrent.cost).toFixed(2)}`}
        </span>
        {torrent.magnetURI ? <MagnetLinkButton torrent={torrent} /> : false}
      </section>
      {/* @todo Shouldn't we use Status.Download only? */}
      {torrent.status !== Status.Idle && torrent.status !== Status.Seeding && torrent.ready ? (
        <DownloadInfo torrent={torrent} />
      ) : /* @todo Why torrent.ready must be set to false for this to happen? */
      torrent.createdBy ? (
        <UploadInfo torrent={torrent} peers={peers} />
      ) : (
        /* @todo Why would there be a condition where nothing should be shown? */
        false
      )}
    </>
  );
};

export {TorrentInfo, MagnetLinkButton};
