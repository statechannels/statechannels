import {JsonRPCRequest, JsonRPCResponse} from 'web3/providers';
import {ExtendedTorrent} from './library/types';

export enum Status {
  Downloading = 'Downloading',
  Seeding = 'Seeding',
  Completed = 'Completed',
  Idle = 'Idle',
  Connecting = 'Connecting'
}

export type Torrent = ExtendedTorrent & {
  parsedTimeRemaining?: string;
  cost?: string;
  numSeeds?: number;
  status: Status;
  destroyed?: boolean;
};

declare global {
  interface Window {
    EmbeddedWallet: {
      request: (data: JsonRPCRequest) => Promise<JsonRPCResponse>;
      enable: (url?: string) => void;
    };
  }
}
