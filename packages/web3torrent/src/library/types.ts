import {Request, Wire} from 'bittorrent-protocol';
import {Instance as ParseTorrent} from 'parse-torrent';
import WebTorrent, {Torrent, TorrentOptions} from 'webtorrent';
import {PaidStreamingExtension} from './paid-streaming-extension';

export enum ClientEvents {
  PEER_STATUS_CHANGED = 'peer_status_changed',
  CLIENT_RESET = 'client_reset',
  TORRENT_DONE = 'torrent_done',
  TORRENT_ERROR = 'torrent_error',
  TORRENT_NOTICE = 'torrent_notice'
}

export type TorrentCallback = (torrent: Torrent) => any;
export type ExtendedTorrentOptions = TorrentOptions & {createdBy?: string};
// The events are documented at https://webtorrent.io/docs
export enum TorrentEvents {
  DONE = 'done',
  DOWNLOAD = 'download',
  ERROR = 'error',
  INFOHASH = 'infoHash',
  NOTICE = 'notice',
  NOPEERS = 'noPeers',
  METADATA = 'metadata',
  READY = 'ready',
  UPLOAD = 'upload',
  WARNING = 'warning',
  WIRE = 'wire'
}

export enum TorrentTestResult {
  NO_SEEDERS_FOUND,
  SEEDERS_FOUND,
  NO_CONNECTION
}

export enum WireEvents {
  DOWNLOAD = 'download',
  FIRST_REQUEST = 'first_request',
  REQUEST = 'request',
  KEEP_ALIVE = 'keep-alive'
}

export enum PaidStreamingExtensionEvents {
  WARNING = 'warning',
  PSE_HANDSHAKE = 'pse_handshake',
  NOTICE = 'notice',
  REQUEST = 'request'
}

export enum PaidStreamingExtensionNotices {
  MESSAGE = 'message',
  START = 'start',
  STOP = 'stop',
  PERMANENT_STOP = 'permanent-stop',
  ACK = 'ack'
}

export type PaidStreamingExtendedHandshake = {
  pseAccount: string; // WARNING: This is not a string. It is a Buffer.
  outcomeAddress: string;
};

export type PaidStreamingWire = Omit<Wire, 'requests'> &
  {
    -readonly [P in keyof Pick<Wire, 'requests'>]: Wire[P];
  } & {
    paidStreamingExtension: PaidStreamingExtension;
    peerExtendedHandshake: PaidStreamingExtendedHandshake;
    extendedHandshake: PaidStreamingExtendedHandshake;
    extended: (name: 'paidStreamingExtension', data: Buffer) => void;

    uploaded: number;
    downloaded: number;

    _clearTimeout(): void;
    _onRequest(index: number, offset: number, length: number): void;
    _onCancel(index: number, offset: number, length: number): void;
    _onPiece(index: number, offset: number, buffer: Buffer): void;
  };

export const isPaidStreamingWire = (obj: any): obj is PaidStreamingWire =>
  obj !== null &&
  typeof obj === 'object' &&
  // Even though the PaidStreamingWire claims to have a paidStreamingExtension property,
  // it doesn't always appear to be present
  // TODO: Why??
  // 'paidStreamingExtension' in obj &&
  'peerExtendedHandshake' in obj &&
  'extended' in obj;

export type SerializedPaidStreamingWire = Pick<
  PaidStreamingWire,
  | 'peerId'
  | 'amChoking'
  | 'amInterested'
  | 'peerChoking'
  | 'peerInterested'
  | 'peerExtendedHandshake'
  | 'extendedHandshake'
> & {paidStreamingExtension: any};

export type ExtendedHandshake = PaidStreamingExtendedHandshake & {
  m: {
    paidStreamingExtension: any;
  };
};

export type PaidStreamingExtensionNotice = {
  command: PaidStreamingExtensionNotices;
  data: any;
};

export type Wireish = Wire & PaidStreamingWire;
export type PaidStreamingTorrent = ExtendedTorrent & {
  usingPaidStreaming: boolean;
  destroyed?: boolean;
  on(event: TorrentEvents.WIRE, callback: (wire: PaidStreamingWire) => void): void;
  on(
    event: TorrentEvents.NOTICE,
    callback: (wire: PaidStreamingWire, noticeData: PaidStreamingExtensionNotice) => void
  ): void;
};

export type OverridenTorrentProperties = 'pieces';

export type ExtendedTorrentPiece = WebTorrent.TorrentPiece & {
  _reservations: number;
  length: number;
};

export type ExtendedTorrent = Omit<WebTorrent.Torrent, OverridenTorrentProperties> & {
  pieces: Array<ExtendedTorrentPiece | null>;
  requests: Request[];
  wires: PaidStreamingWire[];
  store: any;
  _updateWireWrapper: (wire: PaidStreamingWire) => void;
  _selections: unknown;
  _update(): void;
  _updateWire(wire: PaidStreamingWire): void;
  _reservations: unknown;
};

export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

export type WebTorrentSeedInput =
  | string
  | string[]
  | File
  | File[]
  | FileList
  | Buffer
  | Buffer[]
  | NodeJS.ReadableStream
  | NodeJS.ReadableStream[];

export type WebTorrentAddInput = string | Buffer | ParseTorrent;

export type PeerWire = Pick<PaidStreamingWire, 'uploaded'>;

export type PeerByTorrent = {
  id: string;
  wire: PaidStreamingWire | PeerWire;
  buffer: string;
  beneficiaryBalance: string;
  uploaded: number;
};

export type TorrentPeers = {
  [key: string /* ChannelId */]: PeerByTorrent;
};

export type PeersByTorrent = {
  [key: string /* InfoHash */]: TorrentPeers;
};

declare module 'webtorrent' {
  export interface Instance {
    tracker: {
      announce: string[];
      getAnnounceOpts: () => {[key: string]: string | number};
      [key: string]: any;
    };
    on(event: 'warning', callback: (err: Error | string) => void): this;
    on(
      event: ClientEvents.PEER_STATUS_CHANGED,
      callback: ({
        torrentPeers,
        torrentInfoHash,
        peerAccount,
        seedingChannelId
      }: {
        torrentPeers: TorrentPeers;
        torrentInfoHash: string;
        peerAccount: string;
        seedingChannelId: string;
      }) => void
    ): this;

    on(event: ClientEvents.TORRENT_DONE, torrent: PaidStreamingTorrent): this;

    on(
      event: ClientEvents.TORRENT_ERROR,
      callback: ({torrent, error}: {torrent: PaidStreamingTorrent; error: string | Error}) => void
    ): this;

    on(
      event: ClientEvents.TORRENT_NOTICE,
      callback: ({
        torrent,
        wire,
        command,
        data
      }: {
        torrent: PaidStreamingTorrent;
        wire: PaidStreamingWire;
        command: PaidStreamingExtensionNotices;
        data: any;
      }) => void
    ): this;
  }

  export interface TorrentFile {
    done: boolean;
  }
}
