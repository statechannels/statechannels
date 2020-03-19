import _, {Dictionary} from 'lodash';
import prettier from 'prettier-bytes';
import React from 'react';
import {ChannelState} from '../../../clients/payment-channel-client';
import {PaidStreamingWire} from '../../../library/types';
import './ChannelsList.scss';
import {WebTorrentContext} from '../../../clients/web3torrent-client';
import {prettyPrintWei, prettyPrintBytes} from '../../../utils/calculateWei';
import {utils} from 'ethers';

export type UploadInfoProps = {
  wires: PaidStreamingWire[];
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
    wires: PaidStreamingWire[],
    participantType: 'payer' | 'beneficiary'
  ) {
    let channelButton;
    const channel = channels[channelId];

    if (channel.status === 'closing') {
      channelButton = <button disabled>Closing ...</button>;
    } else if (channel.status === 'closed') {
      channelButton = <button disabled>Closed</button>;
    } else {
      channelButton = <button disabled>Running</button>;
    }

    const wire = wires.find(
      wire =>
        wire.paidStreamingExtension.peerChannelId === channelId ||
        wire.paidStreamingExtension.pseChannelId === channelId
    );

    let transferred: string;
    const peerAccount = channel[participantType];
    if (wire) {
      transferred =
        participantType === 'beneficiary' ? prettier(wire.uploaded) : prettier(wire.downloaded);
    } else {
      // Use the beneficiery balance as an approximate of the file size, when wire is dropped.
      transferred = prettyPrintBytes(utils.bigNumberify(channel.beneficiaryBalance));
    }

    return (
      <tr className="peerInfo" key={channelId}>
        <td>{channelButton}</td>
        <td className="channel-id">{channelId}</td>
        <td className="peer-id">{peerAccount}</td>
        <td className="uploaded">
          {transferred}
          {participantType === 'beneficiary' ? ` up` : ` down`}
        </td>
        {participantType === 'beneficiary' ? (
          <td className="earned">
            {prettyPrintWei(utils.bigNumberify(channel.beneficiaryBalance))}
          </td>
        ) : (
          <td className="paid">
            -{prettyPrintWei(utils.bigNumberify(channel.beneficiaryBalance))}
          </td>
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
                  this.props.wires,
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
