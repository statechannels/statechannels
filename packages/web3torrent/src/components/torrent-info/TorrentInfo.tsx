import prettier from 'prettier-bytes';
import React, {useState} from 'react';
import {TorrentPeers} from '../../library/types';
import {Status, Torrent} from '../../types';
import {clipboardCopy} from '../../utils/copy-to-clipboard';
import {generateMagnetURL} from '../../utils/magnet';
import {DownloadInfo} from './download-info/DownloadInfo';
import './TorrentInfo.scss';
import {UploadInfo} from './upload-info/UploadInfo';

const MagnetLinkButton: React.FC<{torrent: Torrent}> = ({torrent}) => {
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
      <span className={'tooltiptext ' + magnetInfo.copied} id="myTooltip">
        {magnetInfo.copied ? 'Great! Copied to your clipboard' : 'Copy to clipboard'}
      </span>
      Share Link
    </button>
  );
};

const TorrentInfo: React.FC<{torrent: Torrent; peers?: TorrentPeers}> = ({torrent, peers}) => {
  return (
    <>
      <section className={`torrentInfo ${torrent.magnetURI ? ' with-link' : ''}`}>
        <span className="fileName">{torrent.name}</span>
        <span className="fileSize">{!torrent.length ? '? Mb' : prettier(torrent.length)}</span>
        {torrent.status ? <span className="fileStatus">{torrent.status}</span> : false}
        <span className="fileCost">
          Est. cost {!torrent.cost ? 'Unknown' : `$${Number(torrent.cost).toFixed(2)}`}
        </span>
        {torrent.magnetURI ? <MagnetLinkButton torrent={torrent} /> : false}
      </section>
      {torrent.status !== Status.Idle && torrent.status !== Status.Seeding && torrent.ready ? (
        <DownloadInfo torrent={torrent} />
      ) : torrent.createdBy ? (
        <UploadInfo torrent={torrent} peers={peers} />
      ) : (
        false
      )}
    </>
  );
};

export {TorrentInfo};
