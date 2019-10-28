import {ExtendedTorrent} from './library/types';

export enum Status {
  Downloading = 'Downloading',
  Seeding = 'Seeding',
  Completed = 'Completed',
  Idle = 'Idle',
  Connecting = 'Connecting'
}

export const DownloadingStatuses = [Status.Connecting, Status.Downloading, Status.Completed];
export const UploadingStatuses = [Status.Seeding];
export const IdleStatuses = [Status.Idle, Status.Completed];

export type Torrent = ExtendedTorrent & {
  parsedTimeRemaining?: string;
  cost?: string;
  numSeeds?: number;
  status: Status;
};

declare global {
  interface Window {
    channelProvider: {
      send: (method: string, params: Array<string | number | boolean>) => Promise<any>;
      enable: (url?: string) => Promise<void>;
    };
  }
}
