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
  numSeeds?: number;
  status: Status;
  originalSeed?: boolean;
};

declare global {
  interface Window {
    channelProvider: import('@statechannels/channel-provider').ChannelProviderInterface;
    ethereum: any;
  }
}
