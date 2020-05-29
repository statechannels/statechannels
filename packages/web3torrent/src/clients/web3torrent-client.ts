import React from 'react';
import {WebTorrentAddInput, WebTorrentSeedInput, ExtendedTorrent} from '../library/types';
import Web3TorrentLibrary from '../library/web3torrent-lib';
import {Status} from '../types';
import {paymentChannelClient} from './payment-channel-client';

export const web3TorrentClient = new Web3TorrentLibrary({paymentChannelClient});

export const Web3TorrentClientContext = React.createContext(web3TorrentClient);

// TODO: refactor out, use instead the Web3TorrentLibrary function.
export async function download(torrentData: WebTorrentAddInput): Promise<ExtendedTorrent> {
  await web3TorrentClient.enable();

  return new Promise(resolve =>
    web3TorrentClient.add(torrentData, (torrent: any) =>
      resolve({...torrent, status: Status.Connecting})
    )
  );
}

// TODO: refactor out, use instead the Web3TorrentLibrary function.
export async function upload(input: WebTorrentSeedInput): Promise<ExtendedTorrent> {
  await web3TorrentClient.enable();

  return new Promise(resolve =>
    web3TorrentClient.seed(input, (torrent: any) =>
      resolve({...torrent, status: Status.Seeding, originalSeed: true})
    )
  );
}
