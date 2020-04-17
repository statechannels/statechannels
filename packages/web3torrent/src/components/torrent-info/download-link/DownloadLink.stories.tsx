import {withActions} from '@storybook/addon-actions';
import {text, withKnobs} from '@storybook/addon-knobs';
import {storiesOf} from '@storybook/react';
import React from 'react';
import {TorrentFile} from 'webtorrent';
import {TorrentUI} from '../../../types';
import {DownloadLink} from './DownloadLink';

storiesOf('Web3Torrent', module)
  .addDecorator(withKnobs())
  .addDecorator(withActions('click'))
  .add('DownloadLink', () => (
    <DownloadLink
      torrent={
        {
          name: text('File name', 'Once-Upon-A-Time.zip'),
          done: true,
          files: [({getBlobURL: resolve => resolve(null, 'blob')} as unknown) as TorrentFile]
        } as TorrentUI
      }
    ></DownloadLink>
  ));
