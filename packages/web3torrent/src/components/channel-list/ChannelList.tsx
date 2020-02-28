import React from 'react';
import {Channel} from './channel/Channel';
import {ChannelState} from '../../clients/web3t-channel-client';
import './ChannelList.scss';

export type ChannelListProps = {channels: Array<Partial<ChannelState>>};

const ChannelList: React.FC<ChannelListProps> = ({channels}) => {
  return (
    <table className="channel-list">
      <tbody>
        <tr>
          <td className={'channel-header'}>Channel ID</td>
          <td className={'channel-header'}>Leecher</td>
          <td className={'channel-header'}>Balance</td>
          <td className={'channel-header'}>Seeder</td>
          <td className={'channel-header'}>Balance</td>
        </tr>
        {channels.length ? channels.map(channel => <Channel channel={channel} />) : false}
      </tbody>
    </table>
  );
};

export {ChannelList};
