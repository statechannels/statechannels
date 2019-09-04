import WebTorrent from "webtorrent";
import paidStreamingExtension, {
  PaidStreamingExtensionEvents,
  PaidStreamingExtensionNotices
} from "./wire-extension";

export const WireEvents = {
  DOWNLOAD: "download",
  FIRST_REQUEST: "first_request",
  REQUEST: "request"
};

export const TorrentEvents = {
  WIRE: "wire",
  NOTICE: "notice",
  STOP: "stop",
  DONE: "done",
  ERROR: "error"
};

export const ClientEvents = {
  PEER_STATUS_CHANGED: "peer_status_changed",
  CLIENT_RESET: "client_reset",
  TORRENT_DONE: "torrent_done",
  TORRENT_ERROR: "torrent_error",
  TORRENT_NOTICE: "torrent_notice"
};

/**
 * @this {WebTorrentPaidStreamingClient}
 */
function setupWire (torrent, wire) {
  console.log('>torrent setupWire', torrent)

  wire.use(paidStreamingExtension({ pseAccount: this.pseAccount }));
  wire.setKeepAlive(true);
  wire.setTimeout(65000)
  wire.on('keep-alive', () => {
    console.log(">Don't let it die!", torrent)
    wire._clearTimeout()
  });

  wire.on(WireEvents.DOWNLOAD, bytes => { });

  wire.on(WireEvents.REQUEST, (index, offset, length) => {
    const peerAccount = wire.paidStreamingExtension && wire.paidStreamingExtension.peerAccount;
    if (
      peerAccount in this.allowedPeers &&
      !this.allowedPeers[peerAccount].allowed
    ) {
      this.sendNotice(wire, peerAccount);
    } else {
      if (!(peerAccount in this.allowedPeers)) {
        this.allowedPeers[peerAccount] = { id: peerAccount, wire };
        this.sendNotice(wire, peerAccount);
        this.emit(ClientEvents.PEER_STATUS_CHANGED, { allowedPeers: this.allowedPeers, peerAccount });
      } else {
        this.allowedPeers[peerAccount] = { id: peerAccount, wire, allowed: true };
      }
    }
  });

  wire.paidStreamingExtension.once(PaidStreamingExtensionEvents.REQUEST, () => {
    const peerAccount = wire.paidStreamingExtension && wire.paidStreamingExtension.peerAccount;
    console.log(`> first_request of ${peerAccount}`);
    wire.emit(PaidStreamingExtensionEvents.REQUEST, peerAccount);
  });

  wire.paidStreamingExtension.on(
    PaidStreamingExtensionEvents.NOTICE,
    notice => torrent.emit(PaidStreamingExtensionEvents.NOTICE, wire, notice)
  );
}

function jumpStart (torrent, wire, requestsToClear) {
  console.log('>>> JumpStarting! - ', "torrent ready?" + torrent.ready, torrent)
  console.log('>>> About to clear wire requests: ', requestsToClear, 'from', wire.requests, "length" + wire.requests.length)
  if (!torrent.done && !torrent.paused) {
    wire.requests = [];
    if (requestsToClear) {
      const reservationsToCancel = requestsToClear.filter(pieceI => !!torrent.pieces[pieceI] && torrent.pieces[pieceI]._reservations);

      const canceledReservations = reservationsToCancel.map(pieceI => {
        torrent.pieces[pieceI]._reservations = 0;
        return torrent.pieces[pieceI];
      })
      console.log('>>> Canceled Reservations', canceledReservations)

    }
    console.log('>>> Requests cleared:', wire.requests, torrent._selections, torrent.pieces)
    torrent._updateWire(wire)
  } else {
    console.log('>>> Torrent is working fine or it finished', torrent, wire, requestsToClear);
  }
}

/**
 * @this {WebTorrentPaidStreamingClient}
 */
function setupTorrent (torrent) {
  if (torrent.usingPaidStreaming) {
    return torrent;
  }

  torrent.on(TorrentEvents.WIRE, wire => setupWire.call(this, torrent, wire));
  torrent.on('error', error => console.warn('>torrent error', error))
  torrent.on(TorrentEvents.NOTICE, (wire, notice) => {
    console.log(`> notice recieved from ${wire.peerExtendedHandshake.pseAccount}: ${notice.command}`);
    const { command, data } = notice
    if (command === PaidStreamingExtensionNotices.STOP) {
      console.log("< stop acknowledged", torrent, torrent.discovery, wire);
      wire.paidStreamingExtension.ack();
      torrent.pause();
    }

    if (command === PaidStreamingExtensionNotices.START) {
      console.log("< start acknowledged", torrent, torrent.discovery);
      wire.paidStreamingExtension.ack();
      torrent._startDiscovery();
      torrent.resume();
      wire.unchoke();
      jumpStart(torrent, wire, data && data.pendingRequests)
    }

    this.emit(ClientEvents.TORRENT_NOTICE, torrent, wire, command);
  });



  torrent.on(TorrentEvents.DONE, () => this.emit(ClientEvents.TORRENT_DONE, torrent));

  torrent.on(TorrentEvents.ERROR, err => {
    console.log(">torrent error:", err);
    this.emit(ClientEvents.TORRENT_ERROR, torrent, err);
  });
  torrent.usingPaidStreaming = true;
}

export default class WebTorrentPaidStreamingClient extends WebTorrent {
  constructor(opts) {
    super(opts);
    this.allowedPeers = {};
    this.pseAccount = opts && opts.pseAccount;
    console.log("> TAB PSE ACCOUNT ID: ", this.pseAccount);
  }

  seed () {
    const torrent = super.seed.apply(this, arguments);
    setupTorrent.call(this, torrent);
    return torrent;
  }

  add () {
    const torrent = super.add.apply(this, arguments);
    setupTorrent.call(this, torrent);
    return torrent;
  }

  sendNotice (wire, peerAccount) {
    this.allowedPeers[peerAccount].allowed = false;
    wire.paidStreamingExtension.stop();
    this.emit(ClientEvents.PEER_STATUS_CHANGED, { allowedPeers: this.allowedPeers, peerAccount });
    console.log("> sendNotice", peerAccount);
  }

  retractNotice (wire, peerAccount) {
    this.allowedPeers[peerAccount].allowed = true;
    wire.paidStreamingExtension.start();
    this.emit(ClientEvents.PEER_STATUS_CHANGED, { allowedPeers: this.allowedPeers, peerAccount });
    console.log("> retractNotice", peerAccount);
  }

  togglePeer (peerAccount) {
    const { wire, allowed } = this.allowedPeers[peerAccount];
    console.log('> togglePeer', peerAccount, wire, allowed);
    if (allowed) {
      this.sendNotice(wire, peerAccount);
    } else {
      this.retractNotice(wire, peerAccount);
    }
    this.emit(ClientEvents.PEER_STATUS_CHANGED, { allowedPeers: this.allowedPeers, peerAccount });
  }
}
