import {action, withActions} from '@storybook/addon-actions';
import {number, text, withKnobs} from '@storybook/addon-knobs';
import {storiesOf} from '@storybook/react';
import React from 'react';
import '../../../App.scss';
import '../ShareList.scss';
import {ShareFile} from './ShareFile';
import './ShareFile.scss';

storiesOf('Web3Torrent', module)
  .addDecorator(withKnobs())
  .addDecorator(withActions('click'))
  .add('ShareFile', () => (
    <table className="share-list">
      <tbody>
        <ShareFile
          key="1"
          file={{
            name: text('File name', 'Once-Upon-A-Time.zip', 'File data'),
            length: number('File size (in Mb)', 172, {step: 0.01}, 'File data'),
            numPeers: number('Number of peers', 17, {step: 1}, 'File data'),
            cost: text('Cost', '0.01', 'File data'),
            magnetURI: text('Magnet link', '', 'File data')
          }}
          goTo={action('button-clicked')}
        ></ShareFile>
      </tbody>
    </table>
  ));
