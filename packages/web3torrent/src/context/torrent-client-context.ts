import React from 'react';
import {getTorrentUI} from '../utils/torrent-status-checker';
import {WebTorrentAddInput, ExtendedTorrent, WebTorrentSeedInput} from '../library/types';

import _ from 'lodash';

import {Status, TorrentUI, TorrentStaticData} from '../types';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';
import {BudgetContextInterface} from './budget-context';

export interface TorrentClientContextInterface {
  download: (torrent: WebTorrentAddInput) => Promise<ExtendedTorrent>;
  upload: (input: WebTorrentSeedInput) => Promise<ExtendedTorrent>;
  cancel: (id?: string) => Promise<string>;
  getTorrentUI: (data: TorrentStaticData) => TorrentUI;
}
export const TorrentClientContext = React.createContext<TorrentClientContextInterface>(undefined);
interface Props {
  w3tClient: WebTorrentPaidStreamingClient;
  budgetContext: BudgetContextInterface;
}
export function useTorrentClientContext({
  w3tClient,
  budgetContext
}: Props): TorrentClientContextInterface | undefined {
  const doesBudgetExist = async (): Promise<boolean> => {
    const {budget} = await budgetContext;
    return budget && !_.isEmpty(budget);
  };
  const torrentNamer = (input: WebTorrentSeedInput) => {
    if ((input as FileList).length && (input as FileList).length > 1) {
      return {name: `various.zip`};
    }
    return {};
  };

  const download: (torrent: WebTorrentAddInput) => Promise<ExtendedTorrent> = async torrentData => {
    await w3tClient.enable();
    if (!(await doesBudgetExist())) {
      await budgetContext.createBudget();
    }

    return new Promise((resolve, reject) =>
      w3tClient.add(torrentData, (torrent: any) => resolve({...torrent, status: Status.Connecting}))
    );
  };

  const upload: (input: WebTorrentSeedInput) => Promise<ExtendedTorrent> = async input => {
    await w3tClient.enable();
    // TODO: This only checks if a budget exists, not if we have enough funds in it
    if (!(await doesBudgetExist())) {
      await budgetContext.createBudget();
    }

    return new Promise((resolve, reject) =>
      w3tClient.seed(input, {...torrentNamer(input)}, (torrent: any) => {
        resolve({
          ...torrent,
          status: Status.Seeding,
          originalSeed: true
        });
      })
    );
  };

  const cancel = (id: string = ''): Promise<string> => {
    return new Promise((resolve, reject) =>
      w3tClient.cancel(id, err => {
        if (err) {
          reject(err);
        } else {
          resolve(id);
        }
      })
    );
  };
  return {
    download,
    upload,
    cancel,
    getTorrentUI: data => getTorrentUI(w3tClient, data)
  };
}
