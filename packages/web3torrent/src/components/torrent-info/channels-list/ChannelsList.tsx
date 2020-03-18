import _, {Dictionary} from 'lodash';
import prettier from 'prettier-bytes';
import React from 'react';
import {ChannelState} from '../../../clients/payment-channel-client';
import {PaidStreamingWire} from '../../../library/types';
import './ChannelsList.scss';
import {WebTorrentContext} from '../../../clients/web3torrent-client';
import {prettyPrintWei} from '../../../utils/calculateWei';
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

    if (channels[channelId].status === 'closing') {
      channelButton = <button disabled>Closing ...</button>;
    } else if (channels[channelId].status === 'closed') {
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
    let peerAccount: string;
    if (wire) {
      transferred =
        participantType === 'beneficiary' ? prettier(wire.uploaded) : prettier(wire.downloaded);
      peerAccount = channels[channelId][participantType];
    } else {
      transferred = 'NOWIRE';
      peerAccount = 'NOWIRE';
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
            {prettyPrintWei(utils.bigNumberify(channels[channelId].beneficiaryBalance))}
          </td>
        ) : (
          <td className="paid">
            -{prettyPrintWei(utils.bigNumberify(channels[channelId].beneficiaryBalance))}
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
