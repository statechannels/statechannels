import {JsonRPCRequest, JsonRPCResponse} from 'web3/providers';

export enum Status {
  Downloading = 'Downloading',
  Seeding = 'Seeding',
  Completed = 'Completed',
  Idle = 'Idle',
  Connecting = 'Connecting',
  Stopped = 'Stopped'
}

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

export const EmptyTorrent = {
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
  files: []
} as Torrent;

export type Torrent = {
  name?: string;
  createdBy?: string;
  filename?: string;
  infoHash: string;
  magnetURI: string;
  torrentFile?: Buffer;
  downloaded: number; // in bytes
  uploaded?: number; // in bytes
  downloadSpeed: number; // in bytes/s
  parsedTimeRemaining?: string;
  timeRemaining?: number;
  uploadSpeed: number; // in bytes/s
  progress?: number; // from 0 to 1
  numPeers?: number;
  numSeeds?: number;
  done?: boolean;
  files: TorrentFile[];
  length: number; // Sum of the files length (in bytes).
  cost?: string;
  status: Status;
  ready?: boolean;
  destroyed?: boolean;
};

export type TorrentFile = {
  name: string;
  path?: string;
  length?: number; // in bytes
  downloaded?: number; // in bytes
  progress?: number; // from 0 to 1
  getBlobURL?: (callback: (err, url) => void) => void;
};

declare global {
  interface Window {
    EmbeddedWallet: {
      request: (data: JsonRPCRequest) => Promise<JsonRPCResponse>;
      enable: () => void;
    };
  }
}
