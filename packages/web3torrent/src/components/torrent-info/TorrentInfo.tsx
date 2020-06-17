import prettier from 'prettier-bytes';
import React, {useState, useEffect, useContext} from 'react';
import {DownloadingStatuses, TorrentUI, Status} from '../../types';
import {DownloadInfo} from './download-info/DownloadInfo';
import {DownloadLink} from './download-link/DownloadLink';
import {MagnetLinkButton} from './magnet-link-button/MagnetLinkButton';
import './TorrentInfo.scss';
import {PeerNetworkStats} from './peer-network-stats/PeerNetworkStats';
import {calculateWei, prettyPrintWei} from '../../utils/calculateWei';
import {ChannelCache} from '../../clients/payment-channel-client';
import {FaFileDownload, FaFileUpload} from 'react-icons/fa';
import {ChannelsList} from './channels-list/ChannelsList';

import {track} from '../../analytics';
import {Web3TorrentClientContext} from '../../clients/web3torrent-client';
import {safeUnsubscribe} from '../../utils/react-utls';
import {logger} from '../../logger';
const log = logger.child({module: 'TorrentInfo'});
export type TorrentInfoProps = {
  torrent: TorrentUI;
  channelCache: ChannelCache;
  mySigningAddress: string;
};

const TorrentInfo: React.FC<TorrentInfoProps> = ({
  torrent,
  channelCache = {},
  mySigningAddress
}) => {
  const web3TorrentClient = useContext(Web3TorrentClientContext);
  const [canWithdraw, setCanWithdraw] = useState(true);
  useEffect(() => {
    const subscription = web3TorrentClient.canWithdrawFeed.subscribe(setCanWithdraw);
    return safeUnsubscribe(subscription, log);
  }, [web3TorrentClient.canWithdrawFeed]);

  const [buttonDisabled, setButtonDisabled] = useState(false);
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
        <DownloadInfo torrent={torrent} />
      )}

      {!!torrent && !canWithdraw && (
        <button
          id="cancel-download-button"
          type="button"
          disabled={buttonDisabled}
          className="button cancel"
          onClick={() => {
            track('Torrent Cancelled', {
              infoHash: torrent.infoHash,
              magnetURI: torrent.magnetURI,
              filename: torrent.name,
              filesize: torrent.length
            });
            setButtonDisabled(true);
            return web3TorrentClient.cancel(torrent.infoHash);
          }}
        >
          Stop {torrent && torrent.status === Status.Seeding ? 'Seeding' : 'Downloading'}
        </button>
      )}
      <PeerNetworkStats torrent={torrent} />
      <DownloadLink torrent={torrent} />
      <ChannelsList torrent={torrent} channels={channelCache} mySigningAddress={mySigningAddress} />
    </>
  );
};

export {TorrentInfo};
