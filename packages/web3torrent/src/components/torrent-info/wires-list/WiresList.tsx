import _, {Dictionary} from 'lodash';
import prettier from 'prettier-bytes';
import React from 'react';
import './WiresList.scss';
import {ChannelState} from '../../../clients/payment-channel-client';
import {PaidStreamingWire} from '../../../library/types';

export type UploadInfoProps = {
  wires: PaidStreamingWire[];
  channels: Dictionary<ChannelState>;
  peerType: 'seeder' | 'leecher';
};

const WiresList: React.FC<UploadInfoProps> = ({wires, channels, peerType}) => {
  function wireToTableRow(wire: PaidStreamingWire) {
    const peer = wire.paidStreamingExtension.peerAccount;
    let channelId: string;
    if (peerType === 'seeder') {
      channelId = wire.paidStreamingExtension.pseChannelId;
    } else {
      channelId = wire.paidStreamingExtension.peerChannelId;
    }
    return (
      _.keys(channels).includes(channelId) && (
        <tr className="peerInfo" key={peer}>
          <td>
            <button>Close</button>
          </td>
          <td className="channel-id">{channelId}</td>
          <td className="peer-id">{peer}</td>
          <td className="downloaded">
            {prettier(wire.uploaded)}
            &nbsp;
            {peerType === 'seeder' ? `up` : `down`}
          </td>
          {peerType === 'seeder' ? (
            <td className="earned">{Number(channels[channelId].beneficiaryBalance)} wei</td>
          ) : (
            <td className="paid">-{Number(channels[channelId].beneficiaryBalance)} wei</td>
          )}
        </tr>
      )
    );
  }

  return (
    <section className="wires-list">
      <table className="wires-list-table">
        <tbody>{Object.values(wires).map(wireToTableRow)}</tbody>
      </table>
    </section>
  );
};

export {WiresList};
