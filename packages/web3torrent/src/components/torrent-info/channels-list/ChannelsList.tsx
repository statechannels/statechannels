import _ from 'lodash';
import prettier from 'prettier-bytes';
import React, {useContext} from 'react';
import {ChannelCache, ChannelState} from '../../../clients/payment-channel-client';
import './ChannelsList.scss';
import {prettyPrintWei, prettyPrintBytes} from '../../../utils/calculateWei';
import {utils} from 'ethers';
import {TorrentUI} from '../../../types';
import {Blockie} from 'rimble-ui';
import {Badge, Avatar, Tooltip} from '@material-ui/core';
import {Web3TorrentClientContext} from '../../../clients/web3torrent-client';

type UploadInfoProps = {
  torrent: TorrentUI;
  channels: ChannelCache;
  mySigningAddress: string;
};

function channelIdToTableRow(
  channelState: ChannelState,
  torrent: TorrentUI,
  participantType: 'payer' | 'beneficiary'
) {
  const isBeneficiary = participantType === 'beneficiary';
  const wire = torrent.wires.find(
    wire =>
      wire.paidStreamingExtension.leechingChannelId === channelState.channelId ||
      wire.paidStreamingExtension.seedingChannelId === channelState.channelId
  );

  let dataTransferred: string;
  const peerOutcomeAddress = isBeneficiary
    ? channelState.payer.outcomeAddress
    : channelState.beneficiary.outcomeAddress;

  const peerDestinationAddress = '0x' + peerOutcomeAddress.slice(26).toLowerCase();
  // For now, this ^ is the ethereum address in my peer's metamask

  if (wire) {
    dataTransferred = isBeneficiary ? prettier(wire.uploaded) : prettier(wire.downloaded);
  } else {
    // Use the beneficiery balance as an approximate of the file size, when wire is dropped.
    dataTransferred = prettyPrintBytes(utils.bigNumberify(channelState.beneficiary.balance));
  }

  const weiTransferred = prettyPrintWei(utils.bigNumberify(channelState.beneficiary.balance));

  let connectionStatus;
  if (wire) {
    if (channelState.status === 'running') {
      connectionStatus = isBeneficiary ? 'uploading' : 'downloading';
    } else if (channelState.status === 'closing') {
      connectionStatus = 'closing';
    } else if (channelState.status === 'proposed') {
      connectionStatus = 'starting';
    } else if (channelState.status === 'closed') {
      connectionStatus = 'finished';
    } else {
      connectionStatus = 'unknown';
    }
  } else {
    if (channelState.status === 'closed') {
      connectionStatus = 'finished';
    } else {
      connectionStatus = 'disconnected';
    }
  }

  return (
    <tr className="peerInfo" key={channelState.channelId}>
      <td className={`channel ${channelState.status}`}>
        <div className={`dot ${connectionStatus}`}></div>
        <span className={`status ${connectionStatus}`}>{connectionStatus}</span>
        {/* temporal thing to show the true state instead of a parsed one */}
      </td>
      <td className="peer-id">
        <Tooltip title={peerDestinationAddress} interactive arrow placement="right">
          <Avatar variant="square">
            <Blockie
              opts={{
                seed: peerDestinationAddress.toLowerCase(),
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
          badgeContent={channelState.turnNum.toNumber()}
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
  const web3TorrentClient = useContext(Web3TorrentClientContext);

  const channelsInfo = _.values(channels)
    .filter(
      state =>
        state.payer.signingAddress === mySigningAddress ||
        state.beneficiary.signingAddress === mySigningAddress
    )
    .filter(state => web3TorrentClient.channelIdToTorrentMap[state.channelId] === torrent.infoHash)
    .sort(
      (state1, state2) =>
        statuses.indexOf(state1.status) - statuses.indexOf(state2.status) ||
        Number(state1.channelId) - Number(state2.channelId)
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
          {channelsInfo.map(channelState =>
            channelIdToTableRow(
              channelState,
              torrent,
              channelState.beneficiary.signingAddress === mySigningAddress ? 'beneficiary' : 'payer'
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
