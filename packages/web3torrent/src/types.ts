import {JsonRPCRequest, JsonRPCResponse} from 'web3/providers';

export enum Status {
  Downloading = 'Downloading',
  Seeding = 'Seeding',
  Completed = 'Completed',
  Idle = 'Idle',
  Connecting = 'Connecting',
  Stopped = 'Stopped'
}

export const EmptyTorrent = {
  name: 'unknown',
  magnetURI: '',
  infoHash: '',
  length: 0,
  done: false,
  ready: false,
  downloadSpeed: 0,
  uploadSpeed: 0,
  cost: 0,
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
  cost?: number;
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
