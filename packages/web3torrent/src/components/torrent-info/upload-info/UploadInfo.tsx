import _ from 'lodash';
import React from 'react';
import {Torrent} from '../../../types';
import './UploadInfo.scss';
import {ChannelState} from '../../../clients/payment-channel-client';
import {utils} from 'ethers';
import {ChannelsList} from '../channels-list/ChannelsList';

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
    .reduce((a, b) => bigNumberify(a).add(bigNumberify(b)), bigNumberify(0))
    .toNumber();
  return (
    <>
      <section className="uploadingInfo">
        <p>
          Total Received: <strong>{totalReceived}</strong> wei
          <br />
          <strong data-test-selector="numPeers">{torrent.numPeers}</strong> Peers connected
        </p>
      </section>
      <ChannelsList
        wires={torrent.wires}
        channels={_.pickBy(channelCache, ({channelId}) =>
          myReceivingChannelIds.includes(channelId)
        )}
        participantType={'beneficiary'}
      />
    </>
  );
};

export {UploadInfo};
