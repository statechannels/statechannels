import {withActions} from '@storybook/addon-actions';
import {boolean, number, optionsKnob, text, withKnobs} from '@storybook/addon-knobs';
import {storiesOf} from '@storybook/react';
import React from 'react';
import '../../../App.scss';
import {Status, Torrent} from '../../../types';
import {DownloadInfo} from './DownloadInfo';
import './DownloadInfo.scss';
import {ChannelState} from '../../../clients/payment-channel-client';

const a = '0xFb4A85D4bBf25e10Fc0Bed72f864dD1ead0006e7';
const b = '0xBaaed72f864dD1ead0006e7Fb4A85D4bBf25e10F';
const d = '0xf864dD1ead0006e7Fb4A85D4bBf25e10Fc0Bed72';

const c1 = '0x4A85D4bBf25e10Fc0Bed72Fb4A85D4bBf25e10Fc0Bed72f864dD1ead0006e7Fb';
const c2 = '0xe10Fc0Bed72f864dD1ead0006e7Fb4A85D4bBf25e10Fc0Bed72Fb4A85D4bBf25';

storiesOf('Web3Torrent', module)
  .addDecorator(withKnobs())
  .addDecorator(withActions('click'))
  .add('DownloadInfo', () => (
    <DownloadInfo
      torrent={
        {
          downloaded: number('Downloaded (bytes)', 1000000, {}, 'Torrent data'),
          length: number('Length (bytes)', 10000000, {}, 'Torrent data'),
          status: optionsKnob(
            'Status',
            {
              Downloading: Status.Downloading,
              Idle: Status.Idle,
              Completed: Status.Completed,
              Connecting: Status.Connecting
            },
            Status.Downloading,
            {display: 'select'},
            'Behavior'
          ),
          done: boolean('Is torrent done?', false, 'Behavior'),
          parsedTimeRemaining: text('Estimated time remaining', 'ETA 1h 2m 3s', 'Behavior'),
          downloadSpeed: number('Download speed (bytes/s)', 200000, {}, 'Torrent data'),
          uploadSpeed: number('Upload speed (bytes/s)', 100000, {}, 'Torrent data'),
          numPeers: number('Number of peers', 50, {}, 'Torrent data'),
          wires: [
            {
              paidStreamingExtension: {
                peerAccount: d,
                peerChannelId: c1
              },
              uploaded: 666
            },
            {
              paidStreamingExtension: {
                peerAccount: a,
                peerChannelId: c2
              },
              uploaded: 333
            }
          ]
        } as Torrent
      }
      channelCache={{
        [c1]: {
          channelId: c1,
          beneficiary: d,
          payer: b,
          beneficiaryBalance: '0x13'
        } as ChannelState,
        [c2]: {
          channelId: c2,
          beneficiary: a,
          payer: b,
          beneficiaryBalance: '0x6'
        } as ChannelState
      }}
      mySigningAddress={b}
    ></DownloadInfo>
  ));
