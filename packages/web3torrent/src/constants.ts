import {Status, Torrent} from './types';
import {ChannelState} from './clients/payment-channel-client';
import {bigNumberify} from 'ethers/utils';

export const WEI_PER_BYTE = bigNumberify(1); // cost per byte
export const BLOCK_LENGTH = 1 << 14; // Standard request length.
export const PEER_TRUST = 1; //amount of trust between peers. It's equivalent to the amount of request to pre-pay.
// The recomended value is 5 ( the size of the queue of requests made by the leecher to the seeder)

export const BUFFER_REFILL_RATE = bigNumberify(WEI_PER_BYTE.mul(BLOCK_LENGTH * PEER_TRUST));
// number of requests the leecher wishes to increase the buffer by
// These variables control the amount of (micro)trust the leecher must invest in the seeder
// As well as the overall performance hit of integrating payments into webtorrent.
// A high BUFFER_REFILL_RATE increases the need for trust, but decreases the number of additional messages and therefore latency
// It can also cause a payment to go above the leecher's balance / capabilities

export const INITIAL_SEEDER_BALANCE = bigNumberify(0); // needs to be zero so that depositing works correctly (unidirectional payment channel)
export const INITIAL_LEECHER_BALANCE = bigNumberify(BUFFER_REFILL_RATE.mul(10000)); // e.g. gwei = 1e9 = nano-ETH

// firebase setup
export const HUB_ADDRESS = 'TODO';
export const FIREBASE_PREFIX = 'web3t';
export const fireBaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: `${process.env.REACT_APP_FIREBASE_PROJECT}.firebaseapp.com`,
  databaseURL: `https://${process.env.REACT_APP_FIREBASE_PROJECT}.firebaseio.com`,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT,
  storageBucket: '',
  messagingSenderId: '913007764573'
};

export const defaultTrackers = [
  // 'udp://explodie.org:6969',
  // 'udp://tracker.coppersurfer.tk:6969',
  // 'udp://tracker.empire-js.us:1337',
  // 'udp://tracker.leechers-paradise.org:6969',
  // 'udp://tracker.opentrackr.org:1337',
  // 'wss://tracker.btorrent.xyz',
  // 'wss://tracker.openwebtorrent.com'
  'http://localhost:8000/announce',
  'udp://0.0.0.0:8000',
  'udp://localhost:8000',
  'ws://localhost:8000'
];

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

// Mocked Constants
export const mockTorrents: Array<Partial<Torrent>> = [
  {
    name: 'Sintel',
    length: 129302391,
    numSeeds: 47,
    numPeers: 12,
    files: [],
    magnetURI:
      'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent'
  },
  {
    name: 'Big Buck Bunny',
    length: 276445467,
    numSeeds: 8,
    numPeers: 6,
    files: [],
    magnetURI:
      'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fbig-buck-bunny.torrent'
  },
  {
    name: 'Cosmos Laundromat',
    length: 220864086,
    numSeeds: 10,
    numPeers: 6,
    files: [],
    magnetURI:
      'magnet:?xt=urn:btih:c9e15763f722f23e98a29decdfae341b98d53056&dn=Cosmos+Laundromat&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fcosmos-laundromat.torrent'
  }
];

export const mockCurrentUser = '0x8fd00f170fdf3772c5ebdcd90bf257316c69ba45';
const mockBalance = 200000000000000;
export const mockLeecherA = '0x829bd824b016326a401d083b33d092293333a830';
export const mockLeecherB = '0x3b33d092293333a830829bd824b016326a401d08';
export const mockSeeder = '0xc631e3bf86075f4d2b45ba974cff4ef5a5f922a0';

export const mockChannels: Array<Partial<ChannelState>> = [
  {
    channelId: '0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c',
    payer: mockLeecherA,
    payerBalance: bigNumberify(mockBalance / 2).toString(),
    beneficiary: mockCurrentUser,
    beneficiaryBalance: bigNumberify(mockBalance).toString()
  },
  {
    channelId: '0xb43b0a0d3e029c4c5a0b54d5dc17e0aadc383d2d',
    payer: mockLeecherB,
    payerBalance: bigNumberify(mockBalance * 6).toString(),
    beneficiary: mockCurrentUser,
    beneficiaryBalance: bigNumberify(mockBalance).toString()
  },
  {
    channelId: '0x7bc8f170fdf3772c5ebdcd90bf257316c69ba45',
    payer: mockCurrentUser,
    payerBalance: bigNumberify(mockBalance).toString(),
    beneficiary: mockSeeder,
    beneficiaryBalance: bigNumberify(mockBalance * 2).toString()
  }
];
