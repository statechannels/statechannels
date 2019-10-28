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
    channelProvider: {
      send: (method: string, params: Array<string | number | boolean>) => Promise<any>;
      enable: (url?: string) => Promise<void>;
    };
  }
}
