import _ from 'lodash';
import React from 'react';
import prettier from 'prettier-bytes';
import {Torrent} from '../../../types';
import './UploadInfo.scss';
import {ChannelState} from '../../../clients/payment-channel-client';
import {utils} from 'ethers';
import {ChannelsList} from '../channels-list/ChannelsList';
import {prettyPrintWei} from '../../../utils/calculateWei';

const bigNumberify = utils.bigNumberify;

export type UploadInfoProps = {
  torrent: Torrent;
  channelCache: Record<string, ChannelState>;
  mySigningAddress: string;
};

const UploadInfo: React.FC<UploadInfoProps> = ({
  torrent,
  channelCache = {},
  mySigningAddress
}: UploadInfoProps) => {
  const myReceivingChannelIds: string[] = Object.keys(channelCache).filter(
    key => channelCache[key].beneficiary === mySigningAddress
  );
  const totalReceived = myReceivingChannelIds
    .map(id => channelCache[id].beneficiaryBalance)
    .reduce((a, b) => bigNumberify(a).add(bigNumberify(b)), bigNumberify(0));
  return (
    <>
      {torrent.originalSeed && (
        <section className="uploadingInfo">
          <p>
            {prettier(torrent.done || !torrent.downloadSpeed ? 0 : torrent.downloadSpeed)}
            /s down, {prettier(!torrent.uploadSpeed ? 0 : torrent.uploadSpeed)}/s up
            <br />
            <strong data-test-selector="numPeers">{torrent.numPeers}</strong> Peers connected
          </p>
        </section>
      )}
      <ChannelsList
        torrent={torrent}
        channels={_.pickBy(channelCache, ({channelId}) =>
          myReceivingChannelIds.includes(channelId)
        )}
        participantType={'beneficiary'}
      />
      {!totalReceived.isZero() && (
        <section className="totalReceived">
          <p>
            Total Received: <strong>{prettyPrintWei(totalReceived)}</strong>
          </p>
        </section>
      )}
    </>
  );
};

export {UploadInfo};
