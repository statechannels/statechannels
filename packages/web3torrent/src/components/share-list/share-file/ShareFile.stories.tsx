import {withActions} from '@storybook/addon-actions';
import {withKnobs} from '@storybook/addon-knobs';
import {storiesOf} from '@storybook/react';
import React from 'react';
import '../../../App.scss';
import '../ShareList.scss';
import {ShareFile} from './ShareFile';
import './ShareFile.scss';
import {createMockTorrentUI} from '../../../utils/test-utils';
import {MemoryRouter} from 'react-router-dom';
import {RoutePath} from '../../../routes';

// todo: fix after type refactor
storiesOf('Web3Torrent', module)
  .addDecorator(withKnobs())
  .addDecorator(withActions('click'))
  .addDecorator(story => <MemoryRouter initialEntries={[RoutePath.Root]}>{story()}</MemoryRouter>)
  .add('ShareFile', () => (
    <table className="share-list">
      <tbody>
        <ShareFile key="1" file={createMockTorrentUI()}></ShareFile>
      </tbody>
    </table>
  ));
