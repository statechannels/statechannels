import _ from 'lodash';
import prettier from 'prettier-bytes';
import React from 'react';
import {cancel} from '../../../clients/web3torrent-client';
import {Torrent} from '../../../types';
import './DownloadInfo.scss';
import {ProgressBar} from './progress-bar/ProgressBar';
import {ChannelState} from '../../../clients/payment-channel-client';
import {utils} from 'ethers';
import {ChannelsList} from '../channels-list/ChannelsList';
import {prettyPrintWei} from '../../../utils/calculateWei';

const bigNumberify = utils.bigNumberify;

export type DownloadInfoProps = {
  torrent: Torrent;
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
  const totalSpent = myPayingChannelIds
    .map(id => channelCache[id].beneficiaryBalance)
    .reduce((a, b) => bigNumberify(a).add(bigNumberify(b)), bigNumberify(0));

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
      {!totalSpent.isZero() && (
        <section className="totalPayed">
          <p>
            Total Spent: <strong className="total-spent">{prettyPrintWei(totalSpent)}</strong>
          </p>
        </section>
      )}
    </>
  );
};

export {DownloadInfo};
