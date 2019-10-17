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
