import React from 'react';
import {WebTorrentAddInput, WebTorrentSeedInput, ExtendedTorrent} from '../library/types';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';
import {Status} from '../types';
import {paymentChannelClient} from './payment-channel-client';
import {defaultTrackers, INITIAL_BUDGET_AMOUNT} from '../constants';
import _ from 'lodash';
paymentChannelClient.initialize();
export const web3torrent = new WebTorrentPaidStreamingClient({
  paymentChannelClient: paymentChannelClient,
  tracker: {announce: defaultTrackers}
});

export const Web3TorrentContext = React.createContext(web3torrent);
export const budgetCacheContext = React.createContext(web3torrent.paymentChannelClient.budgetCache);
export const getTorrentPeers = infoHash => web3torrent.peersList[infoHash];

const doesBudgetExist = async (): Promise<boolean> => {
  const budget = await web3torrent.paymentChannelClient.getBudget();
  return !!budget && !_.isEmpty(budget);
};

export const download: (
  torrent: WebTorrentAddInput
) => Promise<ExtendedTorrent> = async torrentData => {
  await web3torrent.enable();
  if (!(await doesBudgetExist())) {
    await web3torrent.paymentChannelClient.createBudget(INITIAL_BUDGET_AMOUNT);
  }

  return new Promise((resolve, reject) =>
    web3torrent.add(torrentData, (torrent: any) => resolve({...torrent, status: Status.Connecting}))
  );
};

export const upload: (input: WebTorrentSeedInput) => Promise<ExtendedTorrent> = async input => {
  await web3torrent.enable();
  // TODO: This only checks if a budget exists, not if we have enough funds in it
  if (!(await doesBudgetExist())) {
    await web3torrent.paymentChannelClient.createBudget(INITIAL_BUDGET_AMOUNT);
  }

  return new Promise((resolve, reject) =>
    web3torrent.seed(input, {...torrentNamer(input)}, (torrent: any) => {
      resolve({
        ...torrent,
        status: Status.Seeding,
        originalSeed: true
      });
    })
  );
};

export const cancel = (id: string = '') => {
  return new Promise((resolve, reject) =>
    web3torrent.cancel(id, err => {
      if (err) {
        reject(err);
      } else {
        resolve(id);
      }
    })
  );
};

const torrentNamer = (input: WebTorrentSeedInput) => {
  if ((input as FileList).length && (input as FileList).length > 1) {
    return {name: `various.zip`};
  }
  return {};
};
