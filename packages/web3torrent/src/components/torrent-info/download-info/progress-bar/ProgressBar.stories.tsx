import {withActions} from '@storybook/addon-actions';
import {number, optionsKnob, withKnobs} from '@storybook/addon-knobs';
import {storiesOf} from '@storybook/react';
import React from 'react';
import '../../../../App.scss';
import {Status} from '../../../../types';
import './ProgressBar';
import {ProgressBar} from './ProgressBar';

storiesOf('Web3Torrent', module)
  .addDecorator(withKnobs())
  .addDecorator(withActions('click'))
  .add('ProgressBar', () => (
    <ProgressBar
      downloaded={number('Downloaded (bytes)', 1000000, {}, 'Behavior')}
      length={number('Length (bytes)', 10000000, {}, 'Behavior')}
      status={optionsKnob(
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
      )}
    />
  ));
