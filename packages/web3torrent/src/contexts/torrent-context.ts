import {useEffect} from 'react';

import React from 'react';
import {getTorrentUI} from '../utils/torrent-status-checker';
import {WebTorrentAddInput, ExtendedTorrent, WebTorrentSeedInput} from '../library/types';
import {Web3TorrentClientContextInterface} from './w3t-client-context';
import _ from 'lodash';
import {INITIAL_BUDGET_AMOUNT} from '../constants';
import {Status, TorrentUI, TorrentStaticData} from '../types';

export interface TorrentClientContextInterface {
  download: (torrent: WebTorrentAddInput) => Promise<ExtendedTorrent>;
  upload: (input: WebTorrentSeedInput) => Promise<ExtendedTorrent>;
  cancel: (id?: string) => Promise<string>;
  getTorrentUI: (data: TorrentStaticData) => TorrentUI;
}
export const TorrentClientContext = React.createContext<TorrentClientContextInterface>(undefined);
interface Props {
  web3TorrentClientContext: Web3TorrentClientContextInterface;
}
export function useTorrentClientContext({
  web3TorrentClientContext
}: Props): TorrentClientContextInterface | undefined {
  const {initialize, initializationStatus} = web3TorrentClientContext;

  useEffect(() => {
    if (initializationStatus === 'Not Initialized') {
      initialize();
    }
  });

  if (initializationStatus !== 'Initialized') {
    return undefined;
  } else {
    return constructContext(web3TorrentClientContext);
  }
}

function constructContext(web3TorrentClientContext) {
  const web3torrent = web3TorrentClientContext.getContext();

  const doesBudgetExist = async (): Promise<boolean> => {
    const budget = await web3torrent.paymentChannelClient.getBudget();
    return !!budget && !_.isEmpty(budget);
  };
  const torrentNamer = (input: WebTorrentSeedInput) => {
    if ((input as FileList).length && (input as FileList).length > 1) {
      return {name: `various.zip`};
    }
    return {};
  };

  const download: (torrent: WebTorrentAddInput) => Promise<ExtendedTorrent> = async torrentData => {
    await web3torrent.enable();
    if (!(await doesBudgetExist())) {
      await web3torrent.paymentChannelClient.createBudget(INITIAL_BUDGET_AMOUNT);
    }

    return new Promise((resolve, reject) =>
      web3torrent.add(torrentData, (torrent: any) =>
        resolve({...torrent, status: Status.Connecting})
      )
    );
  };

  const upload: (input: WebTorrentSeedInput) => Promise<ExtendedTorrent> = async input => {
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

  const cancel = (id: string = ''): Promise<string> => {
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
  return {
    download,
    upload,
    cancel,
    getTorrentUI: data => getTorrentUI(web3torrent, data)
  };
}
