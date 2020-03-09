import {configure} from '@storybook/react';
import {WebTorrentContext, web3torrent} from '../../../clients/web3torrent-client';

configure(require.context('../src', true, /\.stories\.tsx$/), module);

const contextWrapper = storyFn => (
  <WebTorrentContext.Provider value={web3torrent}>{storyFn()}</WebTorrentContext.Provider>
);

addDecorator(contextWrapper);
