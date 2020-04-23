import _ from 'lodash';
import prettier from 'prettier-bytes';
import React, {useContext} from 'react';
import './DownloadInfo.scss';
import {ProgressBar} from './progress-bar/ProgressBar';
import {ChannelState} from '../../../clients/payment-channel-client';
import {ChannelsList} from '../channels-list/ChannelsList';
import {TorrentUI} from '../../../types';
import {TorrentClientContext} from '../../../contexts/torrent-context';

export type DownloadInfoProps = {
  torrent: TorrentUI;
  channelCache: Record<string, ChannelState>;
  mySigningAddress: string;
};

const DownloadInfo: React.FC<DownloadInfoProps> = ({
  torrent,
  channelCache = {},
  mySigningAddress
}: DownloadInfoProps) => {
  const myPayingChannelIds: string[] = Object.keys(channelCache).filter(
    key => channelCache[key].payer === mySigningAddress
  );
  const {cancel} = useContext(TorrentClientContext);
  const displayProgress = !(torrent.done || torrent.paused);
  return (
    <>
      <section className="downloadingInfo">
        {displayProgress ? (
          <>
            <ProgressBar
              downloaded={torrent.downloaded}
              length={torrent.length}
              status={torrent.status}
            />
            <button
              id="cancel-download-button"
              type="button"
              className="button cancel"
              onClick={() => cancel(torrent.infoHash)}
            >
              Cancel Download
            </button>
          </>
        ) : (
          false
        )}
        <p>
          {torrent.parsedTimeRemaining}.{' '}
          {prettier(torrent.done || !torrent.downloadSpeed ? 0 : torrent.downloadSpeed)}
          /s down, {prettier(!torrent.uploadSpeed ? 0 : torrent.uploadSpeed)}/s up
          <br />
          Connected to <strong>{torrent.numPeers}</strong> peers.
        </p>
      </section>
      <ChannelsList
        torrent={torrent}
        channels={_.pickBy(channelCache, ({channelId}) => myPayingChannelIds.includes(channelId))}
        participantType={'payer'}
      />
    </>
  );
};

export {DownloadInfo};
