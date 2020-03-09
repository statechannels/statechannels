import _, {Dictionary} from 'lodash';
import prettier from 'prettier-bytes';
import React from 'react';
import {ChannelState} from '../../../clients/payment-channel-client';
import {PaidStreamingWire} from '../../../library/types';

import './ChannelsList.scss';

export type UploadInfoProps = {
  wires: PaidStreamingWire[];
  channels: Dictionary<ChannelState>;
  peerType: 'seeder' | 'leecher';
  closeChannel: (channelId: string) => Promise<ChannelState>;
};

const ChannelsList: React.FC<UploadInfoProps> = ({wires, channels, peerType, closeChannel}) => {
  function channelIdToTableRow(channelId: string) {
    let channelButton;

    if (channels[channelId].status === 'closing') {
      channelButton = <button disabled>Closing ...</button>;
    } else if (channels[channelId].status === 'closed') {
      channelButton = <button disabled>Closed</button>;
    } else {
      channelButton = <button onClick={() => closeChannel(channelId)}>Close Channel</button>;
    }

    const wire = wires.find(
      wire =>
        wire.paidStreamingExtension.peerChannelId === channelId ||
        wire.paidStreamingExtension.pseChannelId === channelId
    );
    const {uploaded} = wire;
    const {peerAccount} = wire.paidStreamingExtension;

    return (
      <tr className="peerInfo" key={peerAccount}>
        <td>{channelButton}</td>
        <td className="channel-id">{channelId}</td>
        <td className="peer-id">{peerAccount}</td>
        <td className="uploaded">
          {uploaded && prettier(uploaded)}
          &nbsp;
          {peerType === 'seeder' ? `up` : `down`}
        </td>
        {peerType === 'seeder' ? (
          <td className="earned">{Number(channels[channelId].beneficiaryBalance)} wei</td>
        ) : (
          <td className="paid">-{Number(channels[channelId].beneficiaryBalance)} wei</td>
        )}
      </tr>
    );
  }

  return (
    <section className="wires-list">
      <table className="wires-list-table">
        <tbody>
          {_.keys(channels)
            .sort((channelId1, channelId2) => Number(channelId1) - Number(channelId2))
            .map(channelIdToTableRow)}
        </tbody>
      </table>
    </section>
  );
};

export {ChannelsList};
