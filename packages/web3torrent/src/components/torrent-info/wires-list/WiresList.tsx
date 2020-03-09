import _, {Dictionary} from 'lodash';
import prettier from 'prettier-bytes';
import React, {useContext} from 'react';

import {WebTorrentContext} from '../../../clients/web3torrent-client';
import {ChannelState} from '../../../clients/payment-channel-client';
import {PaidStreamingWire} from '../../../library/types';

import './WiresList.scss';

export type UploadInfoProps = {
  wires: PaidStreamingWire[];
  channels: Dictionary<ChannelState>;
  peerType: 'seeder' | 'leecher';
};

const WiresList: React.FC<UploadInfoProps> = ({wires, channels, peerType}) => {
  const web3torrent = useContext(WebTorrentContext);

  function wireToTableRow({
    uploaded,
    paidStreamingExtension: {peerAccount, peerChannelId, pseChannelId}
  }: PaidStreamingWire | undefined) {
    const channelId = peerType === 'seeder' ? pseChannelId : peerChannelId;

    if (_.keys(channels).includes(channelId)) {
      let channelButton;

      if (channels[channelId].status === 'closing') {
        channelButton = <button disabled>Closing ...</button>;
      } else if (channels[channelId].status === 'closed') {
        channelButton = <button disabled>Closed</button>;
      } else {
        channelButton = (
          <button onClick={() => web3torrent.paymentChannelClient.closeChannel(channelId)}>
            Close Channel
          </button>
        );
      }

      return (
        <tr className="peerInfo" key={peerAccount}>
          <td>{channelButton}</td>
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
      );
    }

    return undefined;
  }

  return (
    <section className="wires-list">
      <table className="wires-list-table">
        <tbody>
          {wires
            .sort(
              (wire1, wire2) =>
                Number(wire1.paidStreamingExtension.peerAccount) -
                Number(wire2.paidStreamingExtension.peerAccount)
            )
            .map(wireToTableRow)}
        </tbody>
      </table>
    </section>
  );
};

export {WiresList};
