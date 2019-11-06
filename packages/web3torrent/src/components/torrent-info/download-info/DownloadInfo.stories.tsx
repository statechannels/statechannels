import {withActions} from '@storybook/addon-actions';
import {boolean, number, optionsKnob, text, withKnobs} from '@storybook/addon-knobs';
import {storiesOf} from '@storybook/react';
import React from 'react';
import '../../../App.scss';
import {Status, Torrent} from '../../../types';
import {DownloadInfo} from './DownloadInfo';
import './DownloadInfo.scss';

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
          numPeers: number('Number of peers', 50, {}, 'Torrent data')
        } as Torrent
      }
    ></DownloadInfo>
  ));
