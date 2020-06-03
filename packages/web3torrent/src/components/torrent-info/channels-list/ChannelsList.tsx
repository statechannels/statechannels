import _ from 'lodash';
import prettier from 'prettier-bytes';
import React from 'react';
import {ChannelCache} from '../../../clients/payment-channel-client';
import './ChannelsList.scss';
import {prettyPrintWei, prettyPrintBytes} from '../../../utils/calculateWei';
import {utils} from 'ethers';
import {TorrentUI} from '../../../types';
import {Blockie} from 'rimble-ui';
import {Badge, Avatar, Tooltip} from '@material-ui/core';

type UploadInfoProps = {
  torrent: TorrentUI;
  channels: ChannelCache;
  mySigningAddress: string;
};

function channelIdToTableRow(
  channelId: string,
  channels: ChannelCache,
  torrent: TorrentUI,
  participantType: 'payer' | 'beneficiary'
) {
  const channel = channels[channelId];
  const isBeneficiary = participantType === 'beneficiary';
  const wire = torrent.wires.find(
    wire =>
      wire.paidStreamingExtension.leechingChannelId === channelId ||
      wire.paidStreamingExtension.seedingChannelId === channelId
  );

  let dataTransferred: string;
  const peerOutcomeAddress = isBeneficiary
    ? channel.payer.outcomeAddress
    : channel.beneficiary.outcomeAddress;

  const peerSelectedAddress = '0x' + peerOutcomeAddress.slice(26).toLowerCase();
  // For now, this ^ is the ethereum address in my peer's metamask

  if (wire) {
    dataTransferred = isBeneficiary ? prettier(wire.uploaded) : prettier(wire.downloaded);
  } else {
    // Use the beneficiery balance as an approximate of the file size, when wire is dropped.
    dataTransferred = prettyPrintBytes(utils.bigNumberify(channel.beneficiary.balance));
  }

  const weiTransferred = prettyPrintWei(utils.bigNumberify(channel.beneficiary.balance));

  let connectionStatus;
  if (wire) {
    if (channel.status === 'running') {
      connectionStatus = isBeneficiary ? 'uploading' : 'downloading';
    } else if (channel.status === 'closing') {
      connectionStatus = 'closing';
    } else if (channel.status === 'proposed') {
      connectionStatus = 'starting';
    } else if (channel.status === 'closed') {
      connectionStatus = 'finished';
    } else {
      connectionStatus = 'unknown';
    }
  } else {
    if (channel.status === 'closed') {
      connectionStatus = 'finished';
    } else {
      connectionStatus = 'disconnected';
    }
  }

  return (
    <tr className="peerInfo" key={channelId}>
      <td className={`channel ${channel.status}`}>
        <div className={`dot ${connectionStatus}`}></div>
        <span className={`status ${connectionStatus}`}>{connectionStatus}</span>
        {/* temporal thing to show the true state instead of a parsed one */}
      </td>
      <td className="peer-id">
        <Tooltip title={peerSelectedAddress} interactive arrow placement="right">
          <Avatar variant="square">
            <Blockie
              opts={{
                seed: peerSelectedAddress,
                bgcolor: '#3531ff',
                size: 6,
                scale: 4,
                spotcolor: '#000'
              }}
            />
          </Avatar>
        </Tooltip>
      </td>
      <td>
        <Badge
          badgeContent={channel.turnNum.toNumber()}
          color={isBeneficiary ? 'primary' : 'error'}
          overlap={'circle'}
          showZero={true}
          max={9999}
        ></Badge>
      </td>
      <td className="transferred">
        <div className="type">{isBeneficiary ? 'uploaded' : 'downloaded'}</div>
        <div className="amount">{dataTransferred + ' '}</div>
      </td>
      <td className="exchanged">
        <div className="type">{isBeneficiary ? 'earned' : 'spent'}</div>
        <div className="amount">{weiTransferred + ' '}</div>
      </td>
    </tr>
  );
}

export const ChannelsList: React.FC<UploadInfoProps> = ({torrent, channels, mySigningAddress}) => {
  const statuses = ['running', 'closing', 'proposing', 'closed'];

  const channelsInfo = _.keys(channels)
    .filter(
      id =>
        channels[id].payer.signingAddress === mySigningAddress ||
        channels[id].beneficiary.signingAddress === mySigningAddress
    )
    .sort(
      (id1, id2) =>
        statuses.indexOf(channels[id1].status) - statuses.indexOf(channels[id2].status) ||
        Number(id1) - Number(id2)
    );
  return (
    <section className="wires-list">
      <table className="wires-list-table">
        {channelsInfo.length > 0 && (
          <thead>
            <tr className="peerInfo">
              <td>Status</td>
              <td>Peer</td>
              <td>Transactions</td>
              <td>Data</td>
              <td>Funds</td>
            </tr>
          </thead>
        )}
        <tbody>
          {channelsInfo.map(key =>
            channelIdToTableRow(
              key,
              channels,
              torrent,
              channels[key].beneficiary.signingAddress === mySigningAddress
                ? 'beneficiary'
                : 'payer'
            )
          )}
        </tbody>
      </table>
    </section>
  );
};

// This gives inaccurate results when the channel is closing or closed
export function turnNumToNumPayments(turnNum: number): number {
  return turnNum > 3 ? Math.trunc((turnNum - 3) / 2) : 0;
  // turnNum | numPayments
  // 0       | 0
  // 1       | 0
  // 2       | 0
  // 3       | 0
  // 4       | 0
  // 5       | 1
  // 6       | 1
  // 7       | 2
  // 8       | 2
  // 9       | 3
}
