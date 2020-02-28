import {text, withKnobs} from '@storybook/addon-knobs';
import {storiesOf} from '@storybook/react';
import React from 'react';
import '../../../App.scss';
import '../ChannelList.scss';
import {Channel} from './Channel';
import './Channel.scss';

storiesOf('Web3Torrent', module)
  .addDecorator(withKnobs())
  .add('Channel', () => (
    <table className="channel-list">
      <tbody>
        <Channel
          channel={{
            channelId: text('Channel ID', '0x95da8', 'Channel State'),
            leecher: text('Leecher', 'John Doe', 'Channel State'),
            leecherBalance: text('Leecher Balance', '1.0 ETH', 'Channel State'),
            seeder: text('Seeder', 'Kerina Eloso', 'Channel State'),
            seederBalance: text('Seeder Balance', '4.0 ETH', 'Channel State')
          }}
        ></Channel>
      </tbody>
    </table>
  ));