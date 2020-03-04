import {withActions} from '@storybook/addon-actions';
import {number, withKnobs} from '@storybook/addon-knobs';
import {storiesOf} from '@storybook/react';
import React from 'react';
import '../../../App.scss';
import {TorrentPeers} from '../../../library/types';
import {Torrent} from '../../../types';
import {UploadInfo} from './UploadInfo';
import './UploadInfo.scss';

storiesOf('Web3Torrent', module)
  .addDecorator(withActions('click'))
  .addDecorator(withKnobs())
  .add('UploadInfo', () => (
    <UploadInfo
      torrent={
        {
          numPeers: 3
        } as Torrent
      }
      peers={
        {
          '9720534187': {
            id: '9720534187',
            wire: {
              uploaded: number('Uploaded bytes for Peer 9720534187', 3533366, {step: 1000}, 'Peers')
            },
            funds: '50',
            allowed: true,
            seederBalance: '50',
            channelId: '0x0000000000000000000000000000001231927371'
          },
          '9202959009': {
            id: '9202959009',
            wire: {
              uploaded: number('Uploaded bytes for Peer 9202959009', 5611625, {step: 1000}, 'Peers')
            },
            funds: '50',
            allowed: true,
            seederBalance: '50',
            channelId: '0x0000000000000000000000000000001231927371'
          },
          '2190352424': {
            id: '2190352424',
            wire: {
              uploaded: number('Uploaded bytes for Peer 2190352424', 5051532, {step: 1000}, 'Peers')
            },
            funds: '50',
            allowed: true,
            seederBalance: '50',
            channelId: '0x0000000000000000000000000000001231927371'
          }
        } as TorrentPeers
      }
    ></UploadInfo>
  ));
