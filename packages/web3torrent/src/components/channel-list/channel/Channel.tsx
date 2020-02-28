import React from 'react';
import './Channel.scss';
import {ChannelState} from '../../../clients/web3t-channel-client';

export type ChannelProps = {channel: Partial<ChannelState>};

const Channel: React.FC<ChannelProps> = ({channel}: ChannelProps) => {
  return (
    <tr className={'channel'}>
      <td className="name-cell">{channel.channelId}</td>
      <td className="leecher-cell">{channel.leecher}</td>
      <td className="other-cell">{channel.leecherBalance}</td>
      <td className="seeder-cell">{channel.seeder}</td>
      <td className="other-cell">{channel.seederBalance}</td>
    </tr>
  );
};

export {Channel};
