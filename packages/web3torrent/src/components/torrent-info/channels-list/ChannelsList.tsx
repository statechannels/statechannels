import _, {Dictionary} from 'lodash';
import prettier from 'prettier-bytes';
import React, {useContext} from 'react';
import {ChannelState} from '../../../clients/payment-channel-client';
import './ChannelsList.scss';
import {Web3TorrentContext} from '../../../clients/web3torrent-client';
import {prettyPrintWei, prettyPrintBytes} from '../../../utils/calculateWei';
import {utils} from 'ethers';
import {getPeerStatus} from '../../../utils/torrent-status-checker';
import {TorrentUI} from '../../../types';

type UploadInfoProps = {
  torrent: TorrentUI;
  channels: Dictionary<ChannelState>;
  participantType: 'payer' | 'beneficiary';
};

function channelIdToTableRow(
  channelId: string,
  channels: Dictionary<ChannelState>,
  torrent: TorrentUI,
  participantType: 'payer' | 'beneficiary',
  clickHandler: (string) => Promise<ChannelState>
) {
  let channelButton;
  const channel = channels[channelId];
  const isBeneficiary = participantType === 'beneficiary';
  const wire = torrent.wires.find(
    wire =>
      wire.paidStreamingExtension.peerChannelId === channelId ||
      wire.paidStreamingExtension.pseChannelId === channelId
  );
  if (channel.status === 'closing') {
    channelButton = <button disabled>Closing ...</button>;
  } else if (channel.status === 'closed') {
    channelButton = <button disabled>Closed</button>;
  } else if (channel.status === 'challenging') {
    channelButton = <button disabled>Challenging</button>;
  } else {
    channelButton = getPeerStatus(torrent, wire) ? (
      <button disabled>Running</button>
    ) : (
      <button className="button-alt" onClick={() => clickHandler(channelId)}>
        Challenge Channel
      </button>
    );
  }

  let dataTransferred: string;
  const peerAccount = channel[participantType];
  if (wire) {
    dataTransferred = isBeneficiary ? prettier(wire.uploaded) : prettier(wire.downloaded);
  } else {
    // Use the beneficiery balance as an approximate of the file size, when wire is dropped.
    dataTransferred = prettyPrintBytes(utils.bigNumberify(channel.beneficiaryBalance));
  }

  const weiTransferred = prettyPrintWei(utils.bigNumberify(channel.beneficiaryBalance));

  return (
    <tr className="peerInfo" key={channelId}>
      <td className="channel">{channelButton}</td>
      <td className="channel-id">{channelId}</td>
      <td className="peer-id">{peerAccount}</td>
      <td className="transferred">
        {dataTransferred}
        <i className={isBeneficiary ? 'up' : 'down'}></i>
      </td>
      {isBeneficiary ? (
        <td className="earned">{weiTransferred}</td>
      ) : (
        <td className="paid">-{weiTransferred}</td>
      )}
    </tr>
  );
}

export const ChannelsList: React.FC<UploadInfoProps> = ({torrent, channels, participantType}) => {
  const context = useContext(Web3TorrentContext);
  const channelsInfo = _.keys(channels).sort(
    (channelId1, channelId2) => Number(channelId1) - Number(channelId2)
  );
  return (
    <section className="wires-list">
      <table className="wires-list-table">
        {channelsInfo.length > 0 && (
          <thead>
            <tr className="peerInfo">
              <td>Status</td>
              <td>Channel</td>
              <td>Peer</td>
              <td>Data</td>
              <td>Funds</td>
            </tr>
          </thead>
        )}
        <tbody>
          {channelsInfo.map(id =>
            channelIdToTableRow(
              id,
              channels,
              torrent,
              participantType,
              context.paymentChannelClient.challengeChannel
            )
          )}
        </tbody>
      </table>
    </section>
  );
};
