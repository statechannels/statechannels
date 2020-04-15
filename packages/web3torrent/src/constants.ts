/* eslint-disable no-unreachable */
import {Status, Torrent} from './types';
import {ChannelState} from './clients/payment-channel-client';
import {utils} from 'ethers';

export const WEI_PER_BYTE = utils.bigNumberify(1); // cost per byte
export const BLOCK_LENGTH = 1 << 14; // Standard request length.
export const PEER_TRUST = 4; //amount of trust between peers. It's equivalent to the amount of request to pre-pay.
// The recomended value is 5 ( the size of the queue of requests made by the leecher to the seeder)

export const BUFFER_REFILL_RATE = utils.bigNumberify(WEI_PER_BYTE.mul(BLOCK_LENGTH * PEER_TRUST));
// number of requests the leecher wishes to increase the buffer by
// These variables control the amount of (micro)trust the leecher must invest in the seeder
// As well as the overall performance hit of integrating payments into webtorrent.
// A high BUFFER_REFILL_RATE increases the need for trust, but decreases the number of additional messages and therefore latency
// It can also cause a payment to go above the leecher's balance / capabilities

export const INITIAL_SEEDER_BALANCE = utils.bigNumberify(0); // needs to be zero so that depositing works correctly (unidirectional payment channel)

// firebase setup
export const HUB = {
  signingAddress: '0xaaaa84838319627Fa056fC3FC29ab94d479B8502',
  outcomeAddress: '0xaaaa84838319627Fa056fC3FC29ab94d479B8502',
  participantId: 'firebase:simple-hub'
};
export const FIREBASE_PREFIX = process.env.REACT_APP_FIREBASE_PREFIX;
export const fireBaseConfig =
  process.env.NODE_ENV === 'test'
    ? undefined
    : {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        databaseURL: process.env.REACT_APP_FIREBASE_URL
      };

// Tracker URLs
const suffix = process.env.REACT_APP_TRACKER_URL_HTTP_PROTOCOL === 'https' ? 's' : '';
const url = process.env.REACT_APP_TRACKER_URL;
export const defaultTrackers = [
  `http${suffix}://${url}/announce`,
  `udp://${url}`,
  `ws${suffix}://${url}`
];

export const requiredNetwork = Number(process.env.REACT_APP_CHAIN_NETWORK_ID);

// Default Torrent Data
export const EmptyTorrent = ({
  name: 'unknown',
  magnetURI: '',
  infoHash: '',
  length: 0,
  done: false,
  ready: false,
  downloadSpeed: 0,
  uploadSpeed: 0,
  cost: '0',
  status: Status.Idle,
  downloaded: 0,
  files: [],
  wires: []
} as unknown) as Torrent;

// Pre Seeded Constants (by StateChannels team)
export const preSeededTorrents: Array<Partial<Torrent>> = [
  {
    name: 'Sintel.mp4',
    length: 129241752,
    infoHash: 'c53da4fa28aa2edc1faa91861cce38527414d874',
    magnetURI:
      'magnet:?xt=urn%3Abtih%3Ac53da4fa28aa2edc1faa91861cce38527414d874&dn=Sintel.mp4&xl=129241752'
  }
];

// Welcome Page Tracker creation options
export const welcomePageTrackerOpts = {
  infoHash: [preSeededTorrents[0].infoHash],
  announce: defaultTrackers,
  peerId: '2d5757303030372d37454e613073307937495630', // random
  port: 6881,
  getAnnounceOpts: () => ({
    pseAccount: '0x7F0126D6c4270498b6514Cb934a3274898f68777',
    uploaded: 0,
    downloaded: 0
  }) // dummy pseAccount, but it works
};

export const testTorrent = {
  name: 'Big Buck Bunny',
  length: 276445467,
  magnetURI:
    'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&xl=276445467'
};

export const mockCurrentUser = '0x8fd00f170fdf3772c5ebdcd90bf257316c69ba45';
const mockBalance = 200000000000000;
export const mockLeecherA = '0x829bd824b016326a401d083b33d092293333a830';
export const mockLeecherB = '0x3b33d092293333a830829bd824b016326a401d08';
export const mockSeeder = '0xc631e3bf86075f4d2b45ba974cff4ef5a5f922a0';

export const mockChannels: Array<Partial<ChannelState>> = [
  {
    channelId: '0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c',
    payer: mockLeecherA,
    payerBalance: utils.bigNumberify(mockBalance / 2).toString(),
    beneficiary: mockCurrentUser,
    beneficiaryBalance: utils.bigNumberify(mockBalance).toString()
  },
  {
    channelId: '0xb43b0a0d3e029c4c5a0b54d5dc17e0aadc383d2d',
    payer: mockLeecherB,
    payerBalance: utils.bigNumberify(mockBalance * 6).toString(),
    beneficiary: mockCurrentUser,
    beneficiaryBalance: utils.bigNumberify(mockBalance).toString()
  },
  {
    channelId: '0x7bc8f170fdf3772c5ebdcd90bf257316c69ba45',
    payer: mockCurrentUser,
    payerBalance: utils.bigNumberify(mockBalance).toString(),
    beneficiary: mockSeeder,
    beneficiaryBalance: utils.bigNumberify(mockBalance * 2).toString()
  }
];

let SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS: string;
if (process.env.REACT_APP_SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS) {
  SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS =
    process.env.REACT_APP_SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS;
} else {
  throw new Error('Contract address not defined');
}
export {SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS};

export const FUNDING_STRATEGY =
  process.env.REACT_APP_FUNDING_STRATEGY === 'Direct' ? 'Direct' : 'Virtual';

export const INITIAL_BUDGET_AMOUNT = utils.hexZeroPad(utils.parseEther('10').toHexString(), 32);
