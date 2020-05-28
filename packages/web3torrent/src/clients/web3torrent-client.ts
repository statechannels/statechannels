import React from 'react';
import {WebTorrentAddInput, WebTorrentSeedInput, ExtendedTorrent} from '../library/types';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';
import {Status} from '../types';
import {paymentChannelClient} from './payment-channel-client';
import {defaultTrackers, INITIAL_BUDGET_AMOUNT, FUNDING_STRATEGY} from '../constants';
import _ from 'lodash';
import {track} from '../analytics';

export const web3TorrentClient = new WebTorrentPaidStreamingClient({
  paymentChannelClient: paymentChannelClient,
  tracker: {announce: defaultTrackers}
});

export const Web3TorrentClientContext = React.createContext(web3TorrentClient);

export const getTorrentPeers = infoHash => web3TorrentClient.channelsByInfoHash[infoHash];

const doesBudgetExist = async (): Promise<boolean> => {
  const budget = await web3TorrentClient.paymentChannelClient.getBudget();
  return !!budget && !_.isEmpty(budget);
};

export const download: (
  torrent: WebTorrentAddInput
) => Promise<ExtendedTorrent> = async torrentData => {
  await web3TorrentClient.enable();
  if (FUNDING_STRATEGY !== 'Direct' && !(await doesBudgetExist())) {
    await web3TorrentClient.paymentChannelClient.createBudget(INITIAL_BUDGET_AMOUNT);
  }

  return new Promise((resolve, reject) =>
    web3TorrentClient.add(torrentData, (torrent: any) =>
      resolve({...torrent, status: Status.Connecting})
    )
  );
};

export const upload: (input: WebTorrentSeedInput) => Promise<ExtendedTorrent> = async input => {
  await web3TorrentClient.enable();
  // TODO: This only checks if a budget exists, not if we have enough funds in it
  if (FUNDING_STRATEGY !== 'Direct' && !(await doesBudgetExist())) {
    await web3TorrentClient.paymentChannelClient.createBudget(INITIAL_BUDGET_AMOUNT);
  }

  return new Promise((resolve, reject) =>
    web3TorrentClient.seed(input, {...torrentNamer(input)}, (torrent: any) => {
      resolve({
        ...torrent,
        status: Status.Seeding,
        originalSeed: true
      });
    })
  );
};

const torrentNamer = (input: WebTorrentSeedInput) => {
  if ((input as FileList).length && (input as FileList).length > 1) {
    return {name: `various.zip`};
  }
  return {};
};
