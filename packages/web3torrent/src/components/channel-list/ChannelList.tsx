import React from 'react';
import {ChannelContext} from '../../clients/web3t-channel-client';
import './ChannelList.scss';
import {formatUnits} from 'ethers/utils';

class ChannelList extends React.Component {
  static contextType = ChannelContext;
  render() {
    return (
      <div className="channel-list">
        <h2> Receiving Channels</h2>
        <table className="channel-list-table">
          <tbody>
            <tr>
              <td className={'channel-header'}>Channel ID</td>
              <td className={'channel-header'}>Seeder</td>
              <td className={'channel-header'}>Balance</td>
            </tr>
            {this.context.openChannels
              .filter(channel => channel.leecher === this.context.myAddress)
              .map(channel => (
                <tr className={'channel'} key={channel.channelId}>
                  <td className="channel-address">{channel.channelId}</td>
                  <td className="channel-address">{channel.seeder}</td>
                  <td className="amount-cell">{formatUnits(channel.seederBalance, 'ether')} ETH</td>
                </tr>
              ))}
          </tbody>
        </table>
        <h2> Outlaying Channels</h2>
        <table className="channel-list-table">
          <tbody>
            <tr>
              <td className={'channel-header'}>Channel ID</td>
              <td className={'channel-header'}>Leecher</td>
              <td className={'channel-header'}>Balance</td>
            </tr>
            {this.context.openChannels
              .filter(channel => channel.seeder === this.context.myAddress)
              .map(channel => (
                <tr className={'channel'} key={channel.channelId}>
                  <td className="channel-address">{channel.channelId}</td>
                  <td className="channel-address">{channel.leecher}</td>
                  <td className="amount-cell">
                    {formatUnits(channel.leecherBalance, 'ether')} ETH
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  }
}

export {ChannelList};
