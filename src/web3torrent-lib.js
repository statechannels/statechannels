import WebTorrent from 'webtorrent';
import {
  ClientEvents,
  PaidStreamingExtensionEvents,
  PaidStreamingExtensionNotices,
  TorrentEvents,
  WireEvents
} from './constants';
import paidStreamingExtension from './wire-extension';

export { WireEvents, TorrentEvents, ClientEvents };

/**
 * @this {WebTorrentPaidStreamingClient}
 */
function setupWire(torrent, wire) {
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
    const peerAccount = wire.paidStreamingExtension && wire.paidStreamingExtension.peerAccount;
    const knownPeerAccount = peerAccount in this.allowedPeers[torrent.infoHash];

    if (knownPeerAccount && !this.allowedPeers[torrent.infoHash][peerAccount].allowed) {
      this.blockPeer(torrent.infoHash, wire, peerAccount);
    } else if (!knownPeerAccount) {
      this.allowedPeers[torrent.infoHash][peerAccount] = { id: peerAccount, wire };
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

function jumpStart(torrent, wire, requestsToClear) {
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
    const canceledReservations = [];
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
    console.log('>>> Torrent is working fine or it finished', torrent, wire, requestsToClear);
  }
}

/**
 * @this {WebTorrentPaidStreamingClient}
 */
function setupTorrent(torrent) {
  if (torrent.usingPaidStreaming) {
    return torrent;
  }
  torrent.on('infoHash', () => {
    this.allowedPeers = { ...this.allowedPeers, [torrent.infoHash]: {} };
  });
  torrent.on(TorrentEvents.WIRE, wire => {
    setupWire.call(this, torrent, wire);
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
        jumpStart(torrent, wire);
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
}

export default class WebTorrentPaidStreamingClient extends WebTorrent {
  constructor(opts) {
    super(opts);
    this.allowedPeers = {};
    this.pseAccount = (opts && opts.pseAccount) || Math.floor(Math.random() * 99999999999999999);
    console.log('> TAB PSE ACCOUNT ID: ', this.pseAccount);
  }

  seed() {
    const torrent = super.seed.apply(this, arguments);
    setupTorrent.call(this, torrent);
    console.log('torrent has been setup from the seeder');
    return torrent;
  }

  add() {
    const torrent = super.add.apply(this, arguments);
    setupTorrent.call(this, torrent);
    console.log('torrent has been setup from the leecher');
    return torrent;
  }

  blockPeer(affectedTorrent, wire, peerAccount) {
    this.allowedPeers[affectedTorrent][peerAccount].allowed = false;
    wire.paidStreamingExtension.stop();
    this.emit(ClientEvents.PEER_STATUS_CHANGED, {
      allowedPeers: this.allowedPeers[affectedTorrent],
      affectedTorrent,
      peerAccount
    });
    console.log('> blockPeer', peerAccount, this.allowedPeers);
  }

  unblockPeer(affectedTorrent, wire, peerAccount) {
    this.allowedPeers[affectedTorrent][peerAccount].allowed = true;
    wire.paidStreamingExtension.start();
    this.emit(ClientEvents.PEER_STATUS_CHANGED, {
      allowedPeers: this.allowedPeers[affectedTorrent],
      affectedTorrent,
      peerAccount
    });
    console.log('> unblockPeer', peerAccount, this.allowedPeers);
  }

  togglePeer(affectedTorrent, peerAccount) {
    const { wire, allowed } = this.allowedPeers[affectedTorrent][peerAccount];
    if (allowed) {
      this.blockPeer(affectedTorrent, wire, peerAccount);
    } else {
      this.unblockPeer(affectedTorrent, wire, peerAccount);
    }
    console.log('> togglePeer', peerAccount, '->', this.allowedPeers);
  }
}
