import { Request, Wire } from 'bittorrent-protocol';
import { Instance as ParseTorrent } from 'parse-torrent';
import WebTorrent from 'webtorrent';
import { PaidStreamingExtension } from './paid-streaming-extension';

export const enum ClientEvents {
  PEER_STATUS_CHANGED = 'peer_status_changed',
  CLIENT_RESET = 'client_reset',
  TORRENT_DONE = 'torrent_done',
  TORRENT_ERROR = 'torrent_error',
  TORRENT_NOTICE = 'torrent_notice'
}

export const enum TorrentEvents {
  WIRE = 'wire',
  NOTICE = 'notice',
  STOP = 'stop',
  DONE = 'done',
  ERROR = 'error'
}

export const enum WireEvents {
  DOWNLOAD = 'download',
  FIRST_REQUEST = 'first_request',
  REQUEST = 'request'
}

export const enum PaidStreamingExtensionEvents {
  WARNING = 'warning',
  PSE_HANDSHAKE = 'pse_handshake',
  NOTICE = 'notice',
  FIRST_REQUEST = 'first_request',
  REQUEST = 'request'
}

export const enum PaidStreamingExtensionNotices {
  START = 'start',
  STOP = 'stop',
  ACK = 'ack'
}

export type PaidStreamingExtendedHandshake = {
  pseAccount: string;
};

export type PaidStreamingWire = Omit<Wire, 'requests'> &
  {
    -readonly [P in keyof Pick<Wire, 'requests'>]: Wire[P];
  } & {
    paidStreamingExtension: PaidStreamingExtension;
    peerExtendedHandshake: PaidStreamingExtendedHandshake;
    extendedHandshake: PaidStreamingExtendedHandshake;
    extended: (name: 'paidStreamingExtension', data: Buffer) => void;

    // TODO: Remove after merging https://github.com/DefinitelyTyped/DefinitelyTyped/pull/38469.
    setTimeout(ms: number, unref?: boolean): void;

    _clearTimeout(): void;
    _onRequest(index: number, offset: number, length: number): void;
  };

export type ExtendedHandshake = PaidStreamingExtendedHandshake & {
  m: {
    paidStreamingExtension: any;
  };
};

export type PaidStreamingExtensionNotice = {
  command: PaidStreamingExtensionNotices;
  data: any;
};

export type PaidStreamingTorrent = ExtendedTorrent & {
  usingPaidStreaming: boolean;
  on(event: TorrentEvents.WIRE, callback: (wire: PaidStreamingWire) => void): void;
  on(
    event: TorrentEvents.NOTICE,
    callback: (wire: PaidStreamingWire, noticeData: PaidStreamingExtensionNotice) => void
  ): void;
};

export type OverridenTorrentProperties = 'pieces';

export type ExtendedTorrentPiece = WebTorrent.TorrentPiece & {
  _reservations: number;
};

export type ExtendedTorrent = Omit<WebTorrent.Torrent, OverridenTorrentProperties> & {
  pieces: Array<ExtendedTorrentPiece | null>;
  requests: Request[];

  _startDiscovery(): void;
  _selections: unknown;
  _updateWire(wire: PaidStreamingWire): void;
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

export type PeerByTorrent = {
  id: string;
  wire: PaidStreamingWire;
  allowed: boolean;
};

export type PeersByTorrent = {
  [key: string /* InfoHash */]: {
    [key: string /* PeerAccount */]: PeerByTorrent;
  };
};
