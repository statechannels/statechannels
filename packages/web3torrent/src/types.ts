import {JsonRPCRequest, JsonRPCResponse} from 'web3/providers';

export type Torrent = {
  name?: string;
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
  status?: 'Downloading' | 'Seeding' | 'Completed' | 'Idle' | 'Connecting' | 'Stopped';
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
