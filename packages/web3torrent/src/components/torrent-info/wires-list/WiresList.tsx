import _, {Dictionary} from 'lodash';
import prettier from 'prettier-bytes';
import React from 'react';

import {ChannelState} from '../../../clients/payment-channel-client';
import {PaidStreamingWire} from '../../../library/types';

import './WiresList.scss';

export type UploadInfoProps = {
  wires: PaidStreamingWire[];
  channels: Dictionary<ChannelState>;
  peerType: 'seeder' | 'leecher';
};

const WiresList: React.FC<UploadInfoProps> = ({wires, channels, peerType}) => {
  function wireToTableRow({
    uploaded,
    paidStreamingExtension: {peerAccount, peerChannelId, pseChannelId}
  }: PaidStreamingWire) {
    const channelId = peerType === 'seeder' ? pseChannelId : peerChannelId;

    return (
      _.keys(channels).includes(channelId) && (
        <tr className="peerInfo" key={peerAccount}>
          <td>
            <button>Close</button>
          </td>
          <td className="channel-id">{channelId}</td>
          <td className="peer-id">{peerAccount}</td>
          <td className="downloaded">
            {prettier(uploaded)}
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
        <tbody>{wires.map(wireToTableRow)}</tbody>
      </table>
    </section>
  );
};

export {WiresList};
