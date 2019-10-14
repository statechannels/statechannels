import prettier from 'prettier-bytes';
import React, {useState} from 'react';
import {Torrent} from '../../types';
import {clipboardCopy} from '../../utils/copy-to-clipboard';
import {DownloadInfo} from './download-info/DownloadInfo';
import './TorrentInfo.scss';
import {UploadInfo} from './upload-info/UploadInfo';

const MagnetLinkButton: React.FC<{magnetURI: string}> = ({magnetURI}) => {
  const [magnetInfo, setMagnetInfo] = useState({copied: false, magnet: magnetURI});
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
      <span className={'tooltiptext ' + magnetInfo.copied} id="myTooltip">
        {magnetInfo.copied ? 'Great! Copied to your clipboard' : 'Copy to clipboard'}
      </span>
      Share Link
    </button>
  );
};

const TorrentInfo: React.FC<{torrent: Torrent}> = ({torrent}) => {
  return (
    <>
      <section className={`torrentInfo ${torrent.magnetURI ? ' with-link' : ''}`}>
        <span className="fileName">{torrent.name}</span>
        <span className="fileSize">{!torrent.length ? '? Mb' : prettier(torrent.length)}</span>
        {torrent.status ? <span className="fileStatus">{torrent.status}</span> : false}
        <span className="fileCost">
          Est. cost {!torrent.cost ? 'Unknown' : `$${Number(torrent.cost).toFixed(2)}`}
        </span>
        {torrent.magnetURI ? <MagnetLinkButton magnetURI={torrent.magnetURI} /> : false}
      </section>
      {(torrent.downloaded || torrent.status === 'Connecting') && torrent.ready ? (
        <DownloadInfo torrent={torrent} />
      ) : (
        false
      )}
      {torrent.uploaded ? <UploadInfo torrent={torrent} /> : false}
    </>
  );
};

export {TorrentInfo};
