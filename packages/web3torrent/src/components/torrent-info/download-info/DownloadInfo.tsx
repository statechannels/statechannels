import prettier from 'prettier-bytes';
import React from 'react';
import {remove} from '../../../clients/web3torrent-client';
import {Torrent} from '../../../types';
import './DownloadInfo.scss';
import {ProgressBar} from './progress-bar/ProgressBar';
import {ChannelState} from '../../../clients/payment-channel-client';
import {utils} from 'ethers';
import {WiresList} from '../wires-list/WiresList';

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
  const myLeechingChannelIds: string[] = Object.keys(channelCache).filter(
    key => channelCache[key].payer === mySigningAddress
  );
  const totalSpent = myLeechingChannelIds
    .map(id => channelCache[id].beneficiaryBalance)
    .reduce((a, b) => bigNumberify(a).add(bigNumberify(b)), bigNumberify(0))
    .toNumber();
  return (
    <>
      <section className="downloadingInfo">
        <ProgressBar
          downloaded={torrent.downloaded}
          length={torrent.length}
          status={torrent.status}
        />
        {!torrent.done ? (
          <button type="button" className="button cancel" onClick={() => remove(torrent.infoHash)}>
            Cancel Download
          </button>
        ) : (
          false
        )}
        <p>
          Total Spent: <span className="total-spent">{totalSpent} wei</span>
        </p>
        <p>
          {torrent.parsedTimeRemaining}.{' '}
          {prettier(torrent.done || !torrent.downloadSpeed ? 0 : torrent.downloadSpeed)}
          /s down, {prettier(!torrent.uploadSpeed ? 0 : torrent.uploadSpeed)}/s up
          <br />
          Connected to <strong>{torrent.numPeers}</strong> peers.
        </p>
      </section>
      <WiresList
        torrent={torrent}
        channelCache={channelCache}
        channelIds={myLeechingChannelIds}
        peerType={'leecher'}
      />
    </>
  );
};

export {DownloadInfo};
