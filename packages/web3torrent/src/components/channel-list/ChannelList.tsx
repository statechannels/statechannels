import React from 'react';
import {ChannelContext, ChannelState} from '../../clients/payment-channel-client';
import './ChannelList.scss';
import {formatUnits} from 'ethers/utils';

class ChannelList extends React.Component {
  static contextType = ChannelContext;
  render() {
    return (
      <div className="channel-list">
        <h2> Seeding Channels</h2>
        <table className="channel-list-table">
          <tbody>
            <tr>
              <td className={'channel-header'}>Channel ID</td>
              <td className={'channel-header'}>Leecher</td>
              <td className={'channel-header'}>Earnt</td>
            </tr>
            {Object.values(this.context.channelCache)
              .filter((channel: ChannelState) => channel.proposer === this.context.mySigningAddress)
              .map((channel: ChannelState) => (
                <tr className={'channel'} key={channel.channelId}>
                  <td className="channel-address">{channel.channelId}</td>
                  <td className="channel-address">{channel.acceptor}</td>
                  <td className="amount-cell">{formatUnits(channel.proposerBalance, 'wei')} wei</td>
                </tr>
              ))}
          </tbody>
        </table>
        <h2> Leeching Channels</h2>
        <table className="channel-list-table">
          <tbody>
            <tr>
              <td className={'channel-header'}>Channel ID</td>
              <td className={'channel-header'}>Seeder</td>
              <td className={'channel-header'}>Left to spend</td>
            </tr>
            {Object.values(this.context.channelCache)
              .filter((channel: ChannelState) => channel.acceptor === this.context.mySigningAddress)
              .map((channel: ChannelState) => (
                <tr className={'channel'} key={channel.channelId}>
                  <td className="channel-address">{channel.channelId}</td>
                  <td className="channel-address">{channel.proposer}</td>
                  <td className="amount-cell">{formatUnits(channel.acceptorBalance, 'wei')} wei</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  }
}

export {ChannelList};
