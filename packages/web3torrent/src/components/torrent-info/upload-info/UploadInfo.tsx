import _ from 'lodash';
import React from 'react';
import prettier from 'prettier-bytes';
import './UploadInfo.scss';
import {ChannelState} from '../../../clients/payment-channel-client';
import {ChannelsList} from '../channels-list/ChannelsList';
import {TorrentUI} from '../../../types';

export type UploadInfoProps = {
  torrent: TorrentUI;
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
    </>
  );
};

export {UploadInfo};
