import {withActions} from '@storybook/addon-actions';
import {storiesOf} from '@storybook/react';
import React from 'react';
import '../../../App.scss';
import '../TorrentInfo.scss';
import {MagnetLinkButton} from './MagnetLinkButton';

storiesOf('Web3Torrent', module)
  .addDecorator(withActions('click'))
  .add('MagnetLinkButton', () => (
    <div className="torrentInfo">
      <div className="row">
        <div className="fileLink">
          <MagnetLinkButton />
        </div>
      </div>
    </div>
  ));
