import WebTorrent, { Torrent, TorrentOptions } from 'webtorrent';
import paidStreamingExtension, { PaidStreamingExtensionOptions } from './pse-middleware';
import {
  ClientEvents,
  ExtendedTorrent,
  ExtendedTorrentPiece,
  PaidStreamingExtensionEvents,
  PaidStreamingExtensionNotices,
  PaidStreamingTorrent,
  PaidStreamingWire,
  PeersByTorrent,
  TorrentEvents,
  WebTorrentAddInput,
  WebTorrentSeedInput,
  WireEvents
} from './types';

export type WebTorrentPaidStreamingClientOptions = WebTorrent.Options & Partial<PaidStreamingExtensionOptions>;
export type TorrentCallback = (torrent: Torrent) => any;

export * from './types';

export default class WebTorrentPaidStreamingClient extends WebTorrent {
  allowedPeers: PeersByTorrent;
  pseAccount: string;
  torrents: PaidStreamingTorrent[] = [];

  constructor(opts: WebTorrentPaidStreamingClientOptions = {}) {
    super(opts);
    this.allowedPeers = {};
    this.pseAccount = opts.pseAccount || Math.floor(Math.random() * 99999999999999999).toString();
    console.log('> TAB PSE ACCOUNT ID: ', this.pseAccount);
  }

  seed(
    input: WebTorrentSeedInput,
    optionsOrCallback?: TorrentOptions | TorrentCallback,
    callback?: TorrentCallback
  ): PaidStreamingTorrent {
    let torrent: PaidStreamingTorrent;

    if (typeof optionsOrCallback === 'function') {
      torrent = super.seed(input, optionsOrCallback) as PaidStreamingTorrent;
    } else {
      torrent = super.seed(input, optionsOrCallback, callback) as PaidStreamingTorrent;
    }

    this.setupTorrent(torrent);
    console.log('torrent has been setup from the seeder');
    return torrent;
  }

  add(
    input: WebTorrentAddInput,
    optionsOrCallback?: TorrentOptions | TorrentCallback,
    callback?: TorrentCallback
  ): PaidStreamingTorrent {
    let torrent: PaidStreamingTorrent;

    if (typeof optionsOrCallback === 'function') {
      torrent = super.add(input, optionsOrCallback) as PaidStreamingTorrent;
    } else {
      torrent = super.add(input, optionsOrCallback, callback) as PaidStreamingTorrent;
    }

    this.setupTorrent(torrent);
    console.log('torrent has been setup from the leecher');
    return torrent;
  }

  blockPeer(torrentInfoHash: string, wire: PaidStreamingWire, peerAccount: string) {
    this.allowedPeers[torrentInfoHash][peerAccount].allowed = false;
    wire.paidStreamingExtension.stop();
    this.emit(ClientEvents.PEER_STATUS_CHANGED, {
      allowedPeers: this.allowedPeers[torrentInfoHash],
      affectedTorrent: torrentInfoHash,
      peerAccount
    });
    console.log('> blockPeer', peerAccount, this.allowedPeers);
  }

  unblockPeer(torrentInfoHash: string, wire: PaidStreamingWire, peerAccount: string) {
    this.allowedPeers[torrentInfoHash][peerAccount].allowed = true;
    wire.paidStreamingExtension.start();
    this.emit(ClientEvents.PEER_STATUS_CHANGED, {
      allowedPeers: this.allowedPeers[torrentInfoHash],
      torrentInfoHash,
      peerAccount
    });
    console.log('> unblockPeer', peerAccount, this.allowedPeers);
  }

  togglePeer(torrentInfoHash, peerAccount: string) {
    const { wire, allowed } = this.allowedPeers[torrentInfoHash][peerAccount];
    if (allowed) {
      this.blockPeer(torrentInfoHash, wire, peerAccount);
    } else {
      this.unblockPeer(torrentInfoHash, wire, peerAccount);
    }
    console.log('> togglePeer', peerAccount, '->', this.allowedPeers);
  }

  protected setupWire(torrent: Torrent, wire: PaidStreamingWire) {
    console.log('>torrent setupWire');

    wire.use(paidStreamingExtension({ pseAccount: this.pseAccount }));
    wire.setKeepAlive(true);
    wire.setTimeout(65000);
    wire.on('keep-alive', () => {
      console.log('Shall I Save this wire sir? :', !torrent.done && wire.amChoking);
      if (!torrent.done && wire.amChoking) {
        wire._clearTimeout();
      }
    });

    wire.on(WireEvents.REQUEST, () => {
      const peerAccount = wire.paidStreamingExtension.peerAccount as string;
      const knownPeerAccount = peerAccount in this.allowedPeers[torrent.infoHash];

      if (knownPeerAccount && !this.allowedPeers[torrent.infoHash][peerAccount].allowed) {
        this.blockPeer(torrent.infoHash, wire, peerAccount);
      } else if (!knownPeerAccount) {
        this.allowedPeers[torrent.infoHash][peerAccount] = { id: peerAccount, wire, allowed: false };
        this.blockPeer(torrent.infoHash, wire, peerAccount);
        this.emit(ClientEvents.PEER_STATUS_CHANGED, {
          allowedPeers: this.allowedPeers[torrent.infoHash],
          affectedId: torrent.infoHash,
          peerAccount
        });
      } else {
        this.allowedPeers[torrent.infoHash][peerAccount] = { id: peerAccount, wire, allowed: true };
      }
    });

    wire.paidStreamingExtension.once(PaidStreamingExtensionEvents.REQUEST, () => {
      const peerAccount = wire.paidStreamingExtension && wire.paidStreamingExtension.peerAccount;
      console.log(`> first_request of ${peerAccount}`);
      wire.emit(PaidStreamingExtensionEvents.REQUEST, peerAccount);
    });

    wire.paidStreamingExtension.on(PaidStreamingExtensionEvents.NOTICE, notice =>
      torrent.emit(PaidStreamingExtensionEvents.NOTICE, wire, notice)
    );
  }

  protected setupTorrent(torrent: PaidStreamingTorrent) {
    if (torrent.usingPaidStreaming) {
      return torrent;
    }
    torrent.on('infoHash', () => {
      this.allowedPeers = { ...this.allowedPeers, [torrent.infoHash]: {} };
    });
    torrent.on(TorrentEvents.WIRE, (wire: PaidStreamingWire) => {
      this.setupWire(torrent, wire);
    });
    torrent.on('error', error => {
      console.warn('>torrent error', error);
    });

    torrent.on(TorrentEvents.NOTICE, (wire, { command, data }) => {
      switch (command) {
        case PaidStreamingExtensionNotices.STOP:
          wire.paidStreamingExtension.ack();
          wire.choke();
          break;
        case PaidStreamingExtensionNotices.START:
          wire.paidStreamingExtension.ack();
          this.jumpStart(torrent, wire);
          break;
        default:
          console.log(`< ${command} received from ${wire.peerExtendedHandshake.pseAccount}`, data);
          break;
      }
      this.emit(ClientEvents.TORRENT_NOTICE, torrent, wire, command, data);
    });

    torrent.on(TorrentEvents.DONE, () => this.emit(ClientEvents.TORRENT_DONE, torrent));

    torrent.on(TorrentEvents.ERROR, err => {
      console.log('>torrent error:', err);
      this.emit(ClientEvents.TORRENT_ERROR, torrent, err);
    });
    torrent.usingPaidStreaming = true;

    return torrent;
  }

  protected jumpStart(torrent: ExtendedTorrent, wire: PaidStreamingWire) {
    console.log(
      `>>> JumpStarting! - Torrent: ${torrent.ready ? 'READY' : 'NOT READY'} - With ${
        wire.requests.length
      } wire requests`,
      torrent
    );
    wire.unchoke();
    torrent._startDiscovery();
    torrent.resume();
    if (!torrent.done) {
      wire.requests = [];
      const canceledReservations: ExtendedTorrentPiece[] = [];
      torrent.pieces = torrent.pieces.map(piece => {
        if (piece && !!piece._reservations) {
          piece._reservations = 0;
          canceledReservations.push(piece);
        }
        return piece;
      });
      console.log(
        '>>> Requests cleared:',
        canceledReservations,
        ' current state:',
        wire.requests,
        torrent._selections,
        torrent.pieces
      );
      torrent._updateWire(wire);
    } else {
      console.log('>>> Torrent is working fine or it finished', torrent, wire);
    }
  }
}
