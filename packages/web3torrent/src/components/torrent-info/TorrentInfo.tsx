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

import {track} from '../../segment-analytics';
import {Web3TorrentClientContext} from '../../clients/web3torrent-client';
import {safeUnsubscribe} from '../../utils/react-utls';
import {logger} from '../../logger';
const log = logger.child({module: 'TorrentInfo'});
import {Flash} from 'rimble-ui';
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
  const [wasDownloading, setWasDownloading] = useState(false);
  const [buttonClicked, setButtonClicked] = useState(false);
  // TODO: Currently we can't seem to set the torrent status when canceling an active download
  const downloadCancelled =
    canWithdraw &&
    buttonClicked &&
    wasDownloading &&
    (torrent.status === Status.Downloading || torrent.status === Status.Connecting);

  const seedingCancelled =
    canWithdraw && buttonClicked && !wasDownloading && torrent.status === Status.Completed;
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
          {torrent.status && (
            <span className="fileStatus">
              Status: {downloadCancelled ? 'Cancelled' : torrent.status}
            </span>
          )}
          {torrent.magnetURI && <MagnetLinkButton />}
        </div>
      </section>
      {DownloadingStatuses.includes(torrent.status) &&
        !torrent.originalSeed &&
        !downloadCancelled && <DownloadInfo torrent={torrent} />}

      {downloadCancelled && (
        <Flash my={3} variant="info">
          Download cancelled!
        </Flash>
      )}

      {seedingCancelled && (
        <Flash my={3} variant="info">
          You are no longer seeding the file!
        </Flash>
      )}

      {!canWithdraw && (torrent.status === Status.Completed || torrent.status === Status.Seeding) && (
        <Flash my={3} variant="info">
          {torrent.status === Status.Completed && 'Your download is complete. '}You're now earning
          fees by seeding the file to others. Why not share the{' '}
          <MagnetLinkButton linkText="link?" hideImage={true} />
        </Flash>
      )}
      <div className="buttonContainer">
        <DownloadLink torrent={torrent} />

        {!!torrent && !canWithdraw && (
          <button
            id="cancel-download-button"
            type="button"
            disabled={buttonClicked}
            className="button cancel"
            onClick={async () => {
              track('Torrent Cancelled', {
                infoHash: torrent.infoHash,
                magnetURI: torrent.magnetURI,
                filename: torrent.name,
                filesize: torrent.length
              });
              setButtonClicked(true);
              const wasDownloading =
                torrent.status === Status.Downloading || torrent.status === Status.Connecting;
              await web3TorrentClient.cancel(torrent.infoHash);
              if (wasDownloading) {
                setWasDownloading(true);
              }
            }}
          >
            Stop{' '}
            {torrent && (torrent.status === Status.Seeding || torrent.status === Status.Completed)
              ? 'Seeding'
              : 'Downloading'}
          </button>
        )}
      </div>
      {!downloadCancelled && !seedingCancelled && <PeerNetworkStats torrent={torrent} />}

      <ChannelsList torrent={torrent} channels={channelCache} mySigningAddress={mySigningAddress} />
    </>
  );
};

export {TorrentInfo};
