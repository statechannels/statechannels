import {Status, TorrentUI} from './types';
import {ChannelState, Peer} from './clients/payment-channel-client';
import {utils} from 'ethers';
import path from 'path';

export const VERSION = process.env.VERSION;
export const COMMIT_HASH = process.env.COMMIT_HASH;

export const WEI_PER_BYTE = utils.bigNumberify(1); // cost per byte
export const BLOCK_LENGTH = 1 << 14; // Standard request length.
export const PEER_TRUST = 5; //amount of trust between peers. It's equivalent to the amount of request to pre-pay.
// The recomended value is 5 ( the size of the queue of requests made by the leecher to the seeder)

// number of requests the leecher wishes to increase the buffer by
// These variables control the amount of (micro)trust the leecher must invest in the seeder
// As well as the overall performance hit of integrating payments into webtorrent.
// A high BUFFER_REFILL_RATE increases the need for trust, but decreases the number of additional messages and therefore latency
// It can also cause a payment to go above the leecher's balance / capabilities

export const INITIAL_SEEDER_BALANCE = utils.bigNumberify(0); // needs to be zero so that depositing works correctly (unidirectional payment channel)

const randomNumberGenerator = (length: number) => {
  // Programatic way of getting fixed length number, based of https://stackoverflow.com/a/21816636/6569950
  const base = Math.pow(10, length - 1);
  return Math.floor(base + Math.random() * 9 * base);
};

export function generateRandomPeerId() {
  // based of webtorrent's way of generating random peerId's
  // https://github.com/webtorrent/webtorrent/blob/ed2809159585d2611dff24a48f25748baf78e8fb/index.js#L52
  const randomNumber = String(randomNumberGenerator(9));
  return Buffer.from(`-WW0007-${btoa(randomNumber)}`).toString('hex');
}

// firebase setup
export const HUB = {
  signingAddress: '0xaaaa84838319627Fa056fC3FC29ab94d479B8502',
  outcomeAddress: process.env.HUB_DESTINATION,
  participantId: 'firebase:simple-hub'
};
export const FIREBASE_PREFIX = process.env.FIREBASE_PREFIX;
export const fireBaseConfig =
  process.env.FUNDING_STRATEGY !== 'Virtual'
    ? undefined
    : {
        apiKey: process.env.FIREBASE_API_KEY,
        databaseURL: process.env.FIREBASE_URL
      };

// Tracker URLs
const suffix = process.env.TRACKER_URL_HTTP_PROTOCOL === 'https' ? 's' : '';
const url = process.env.TRACKER_URL;
export const defaultTrackers = [
  `http${suffix}://${url}/announce`,
  `udp://${url}`,
  `ws${suffix}://${url}`
];

export const requiredNetwork = Number(process.env.CHAIN_NETWORK_ID);

export const EmptyTorrentUI: TorrentUI = {
  files: [],
  done: false,
  downloaded: 0,
  downloadSpeed: 0,
  infoHash: '',
  length: 0,
  magnetURI: '',
  name: 'unknown',
  numPeers: 0,
  ready: false,
  paused: false,
  status: Status.Idle,
  uploaded: 0,
  uploadSpeed: 0,
  wires: []
};

// Pre Seeded Constants (by StateChannels team)
const preSeededTorrents: Array<Pick<TorrentUI, 'name' | 'length' | 'infoHash' | 'magnetURI'>> = [
  {
    name: 'nitro-protocol.pdf',
    length: 403507,
    infoHash: '0ab7ca2523f6838a915f30d17ec1703b786c9e5d',
    magnetURI:
      'magnet:?xt=urn:btih:0ab7ca2523f6838a915f30d17ec1703b786c9e5d&dn=nitro-protocol.pdf&xl=403507'
  }
];

export const preseededTorrentsUI: TorrentUI[] = preSeededTorrents.map(partialTorrent => ({
  ...partialTorrent,
  ...getStaticTorrentUI(partialTorrent.infoHash, partialTorrent.name, partialTorrent.length)
}));

export function getStaticTorrentUI(
  infoHash: string,
  nameParam?: string,
  lengthParam?: number
): TorrentUI {
  const name = nameParam || 'unknown';
  const length = lengthParam || 0;
  const magnetURI = defaultTrackers.reduce(
    (magnetURI, tracker) => magnetURI + '&tr=' + tracker,
    `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}&xl=${length}`
  );

  return {
    ...EmptyTorrentUI,
    infoHash,
    name,
    length,
    magnetURI
  };
}

// Welcome Page Tracker creation options
export const defaultTrackerOpts = {
  infoHash: [preSeededTorrents[0].infoHash],
  announce: defaultTrackers,
  peerId: generateRandomPeerId(), // random
  port: 6881,
  getAnnounceOpts: () => ({
    pseAccount: '0x7F0126D6c4270498b6514Cb934a3274898f68777',
    // the pseAccount is only used to allow the client on the tracker server, see
    // https://github.com/statechannels/monorepo/blob/d0c6b1be3a637c88880c0c937d9a6ebc8078799c/packages/web3torrent/tracker/index.js#L16
    uploaded: 0,
    downloaded: 0
  }) // dummy pseAccount, but it works
};

export const testTorrent = {
  name: 'nitro-protocol.pdf',
  length: 403507,
  magnetURI:
    'magnet:?xt=urn:btih:0ab7ca2523f6838a915f30d17ec1703b786c9e5d&dn=nitro-protocol.pdf&xl=403507'
};

export const mockCurrentUser = '0x8fd00f170fdf3772c5ebdcd90bf257316c69ba45';
const mockBalance = 200000000000000;
export const mockLeecherA = '0x829bd824b016326a401d083b33d092293333a830';
export const mockLeecherB = '0x3b33d092293333a830829bd824b016326a401d08';
export const mockSeeder = '0xc631e3bf86075f4d2b45ba974cff4ef5a5f922a0';

const peer = (signingAddress, balance: number): Peer => ({
  signingAddress,
  balance: utils.bigNumberify(balance).toString(),
  outcomeAddress: 'outcome'
});

export const mockChannels: Array<Partial<ChannelState>> = [
  {
    channelId: '0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c',
    payer: peer(mockLeecherA, mockBalance / 2),
    beneficiary: peer(mockCurrentUser, mockBalance)
  },
  {
    channelId: '0xb43b0a0d3e029c4c5a0b54d5dc17e0aadc383d2d',
    payer: peer(mockLeecherB, mockBalance * 6),
    beneficiary: peer(mockCurrentUser, mockBalance)
  },
  {
    channelId: '0x7bc8f170fdf3772c5ebdcd90bf257316c69ba45',
    payer: peer(mockCurrentUser, mockBalance),
    beneficiary: peer(mockSeeder, mockBalance * 2)
  }
];

let SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS: string;
if (process.env.SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS) {
  SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS = process.env.SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS;
} else {
  throw new Error('Contract address not defined');
}
export {SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS};

export const FUNDING_STRATEGY = process.env.FUNDING_STRATEGY === 'Direct' ? 'Direct' : 'Virtual';

export const INITIAL_BUDGET_AMOUNT = utils.hexZeroPad(
  utils.parseUnits(process.env.INITIAL_BUDGET_AMOUNT ?? '100', 'Mwei').toHexString(),
  32
); //  Defaults to 100 Mwei, or MAX_FILE_SIZE * 10

export const MAX_FILE_SIZE = 10 * 1000 * 1000; // 10 million bytes

export const ADD_LOGS = !!process.env.LOG_DESTINATION;
export const LOG_DESTINATION = ADD_LOGS
  ? process.env.LOG_DESTINATION === 'console'
    ? 'console'
    : path.join(process.env.LOG_DESTINATION, 'web3torrent.log')
  : undefined;

export const LOG_LEVEL = ADD_LOGS ? process.env.LOG_LEVEL ?? 'info' : 'silent';

export const TARGET_NETWORK = process.env.TARGET_NETWORK || 'development';
