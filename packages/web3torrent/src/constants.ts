import {Status, Torrent} from './types';

export const defaultTrackers = [
  'udp://explodie.org:6969',
  'udp://tracker.coppersurfer.tk:6969',
  'udp://tracker.empire-js.us:1337',
  'udp://tracker.leechers-paradise.org:6969',
  'udp://tracker.opentrackr.org:1337',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.fastcast.nz',
  'wss://tracker.openwebtorrent.com'
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
  {name: 'Sample_1.dat', length: 350, numSeeds: 27, numPeers: 350, cost: '0.5', files: []},
  {name: 'Sample_2.dat', length: 250, numSeeds: 35, numPeers: 400, cost: '0.5', files: []},
  {name: 'Sample_3.dat', length: 50, numSeeds: 2, numPeers: 360, cost: '0.5', files: []}
];
