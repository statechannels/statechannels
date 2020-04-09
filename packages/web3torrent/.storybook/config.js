import {configure, addDecorator} from '@storybook/react';
import {Web3TorrentContext, web3Torrent} from '../../../clients/web3torrent-client';
import React from 'react';

configure(require.context('../src', true, /\.stories\.tsx$/), module);

const contextWrapper = storyFn => (
  <Web3TorrentContext.Provider value={web3Torrent}>{storyFn()}</Web3TorrentContext.Provider>
);

addDecorator(contextWrapper);
