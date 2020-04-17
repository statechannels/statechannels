import {ExtendedTorrent} from './library/types';

export enum Status {
  Downloading = 'Downloading',
  Seeding = 'Seeding',
  Completed = 'Completed',
  Paused = 'Cancelled',
  Idle = 'Idle',
  Connecting = 'Connecting'
}

export const DownloadingStatuses = [
  Status.Connecting,
  Status.Downloading,
  Status.Completed,
  Status.Paused
];
export const UploadingStatuses = [Status.Seeding];
export const IdleStatuses = [Status.Idle, Status.Completed];

export type Torrent = ExtendedTorrent & {
  parsedTimeRemaining?: string;
  numSeeds?: number;
  status: Status;
  originalSeed?: boolean;
};

export type TorrentUI = Pick<
  Torrent,
  | 'files'
  | 'done'
  | 'downloaded'
  | 'downloadSpeed'
  | 'infoHash'
  | 'length'
  | 'magnetURI'
  | 'name'
  | 'numPeers'
  | 'originalSeed'
  | 'parsedTimeRemaining'
  | 'paused'
  | 'ready'
  | 'status'
  | 'uploaded'
  | 'uploadSpeed'
  | 'wires'
>;

export interface TorrentStaticData {
  infoHash: string;
  name?: string;
  length?: number;
}

declare global {
  interface Window {
    channelProvider: import('@statechannels/channel-provider').ChannelProviderInterface;
    ethereum: any;
  }
}
