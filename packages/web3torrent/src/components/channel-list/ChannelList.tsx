import React from 'react';
import {ChannelState} from '../../clients/web3t-channel-client';
import './ChannelList.scss';
import {formatUnits} from 'ethers/utils';

export type ChannelListProps = {channels: Array<Partial<ChannelState>>; currentUser: string};

const ChannelList: React.FC<ChannelListProps> = ({channels, currentUser}) => {
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
          {channels
            .filter(channel => channel.leecher === currentUser)
            .map(channel => (
              <tr className={'channel'}>
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
          {channels
            .filter(channel => channel.seeder === currentUser)
            .map(channel => (
              <tr className={'channel'}>
                <td className="channel-address">{channel.channelId}</td>
                <td className="channel-address">{channel.leecher}</td>
                <td className="amount-cell">{formatUnits(channel.leecherBalance, 'ether')} ETH</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export {ChannelList};
