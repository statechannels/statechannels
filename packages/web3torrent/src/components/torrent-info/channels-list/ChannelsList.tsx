import _, {Dictionary} from 'lodash';
import prettier from 'prettier-bytes';
import React from 'react';
import {ChannelState} from '../../../clients/payment-channel-client';
import './ChannelsList.scss';
import {WebTorrentContext} from '../../../clients/web3torrent-client';
import {prettyPrintWei, prettyPrintBytes} from '../../../utils/calculateWei';
import {utils} from 'ethers';
import {Torrent} from '../../../types';
import {getPeerStatus} from '../../../utils/torrent-status-checker';

export type UploadInfoProps = {
  torrent: Torrent;
  channels: Dictionary<ChannelState>;
  participantType: 'payer' | 'beneficiary';
};

class ChannelsList extends React.Component<UploadInfoProps> {
  static contextType = WebTorrentContext;

  // Adds typing information to this.context
  context!: React.ContextType<typeof WebTorrentContext>;

  channelIdToTableRow(
    channelId: string,
    channels: Dictionary<ChannelState>,
    torrent: Torrent,
    participantType: 'payer' | 'beneficiary'
  ) {
    let channelButton;
    const channel = channels[channelId];

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
        <button
          className="button-alt"
          onClick={_ => this.context.paymentChannelClient.challengeChannel(channelId)}
        >
          Challenge Channel
        </button>
      );
    }

    let dataTransferred: string;
    const peerAccount = channel[participantType];
    if (wire) {
      dataTransferred =
        participantType === 'beneficiary'
          ? prettier(wire.uploaded) + ` up`
          : prettier(wire.downloaded) + ` down`;
    } else {
      // Use the beneficiery balance as an approximate of the file size, when wire is dropped.
      dataTransferred =
        prettyPrintBytes(utils.bigNumberify(channel.beneficiaryBalance)) +
        (participantType === 'beneficiary' ? ` up` : ` down`);
    }

    const weiTransferred = prettyPrintWei(utils.bigNumberify(channel.beneficiaryBalance));

    return (
      <tr className="peerInfo" key={channelId}>
        <td>{channelButton}</td>
        <td className="channel-id">{channelId}</td>
        <td className="peer-id">{peerAccount}</td>
        <td className="uploaded">{dataTransferred}</td>
        {participantType === 'beneficiary' ? (
          <td className="earned">{weiTransferred}</td>
        ) : (
          <td className="paid">-{weiTransferred}</td>
        )}
      </tr>
    );
  }

  render() {
    return (
      <section className="wires-list">
        <table className="wires-list-table">
          <tbody>
            {_.keys(this.props.channels)
              .sort((channelId1, channelId2) => Number(channelId1) - Number(channelId2))
              .map(id =>
                this.channelIdToTableRow(
                  id,
                  this.props.channels,
                  this.props.torrent,
                  this.props.participantType
                )
              )}
          </tbody>
        </table>
      </section>
    );
  }
}

export {ChannelsList};
