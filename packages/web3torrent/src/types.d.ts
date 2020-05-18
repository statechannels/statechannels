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

export type TorrentUI = Pick<
  ExtendedTorrent,
  | 'files'
  | 'done'
  | 'downloaded'
  | 'downloadSpeed'
  | 'infoHash'
  | 'length'
  | 'magnetURI'
  | 'name'
  | 'numPeers'
  | 'paused'
  | 'ready'
  | 'uploaded'
  | 'uploadSpeed'
  | 'wires'
> & {
  originalSeed?: boolean;
  parsedTimeRemaining?: string;
  status: Status;
};

export interface TorrentStaticData {
  infoHash: string;
  name?: string;
  length?: number;
}

declare global {
  interface Window {
    analytics: SegmentAnalytics.AnalyticsJS;
    channelProvider: import('@statechannels/channel-provider').ChannelProviderInterface;
    ethereum: any;
  }
}
