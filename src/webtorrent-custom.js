import WebTorrent from "webtorrent";
import {
  InitialState,
  WireEvents,
  TorrentEvents,
  ClientEvents,
  PaidStreamingExtensionEvents,
  PaidStreamingExtensionNotices
} from "./constants";
import paidStreamingExtension from "./wire-extension";

export { InitialState, WireEvents, TorrentEvents, ClientEvents }


/**
 * @this {WebTorrentPaidStreamingClient}
 */
function setupWire (torrent, wire) {
  console.log('>torrent setupWire', torrent)

  wire.use(paidStreamingExtension({ pseAccount: this.pseAccount }));
  wire.setKeepAlive(true);
  wire.setTimeout(65000)
  wire.on('keep-alive', () => {
    console.log(">Don't let it die!")
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
  console.log(`>>> JumpStarting! - Torrent: ${torrent.ready ? "READY" : "NOT READY"} - With ${wire.requests.length} wire requests`, torrent);
  if (!torrent.done && !torrent.paused) {
    wire.requests = [];
    const canceledReservations = [];
    torrent.pieces = torrent.pieces.map(piece => {
      if (piece && !!piece._reservations) {
        piece._reservations = 0;
        canceledReservations.push(piece);
      }
      return piece;
    })
    console.log('>>> Requests cleared:', canceledReservations, ' current state:', wire.requests, torrent._selections, torrent.pieces);
    torrent._updateWire(wire);
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
    const { command, data } = notice

    console.log(`> notice recieved from ${wire.peerExtendedHandshake.pseAccount}: ${command} with data:`, data);
    if (command === PaidStreamingExtensionNotices.STOP) {
      console.log("< stop acknowledged", torrent, wire);
      wire.paidStreamingExtension.ack();
      torrent.pause();
    } else if (command === PaidStreamingExtensionNotices.START) {
      console.log("< start acknowledged", torrent, wire);
      wire.paidStreamingExtension.ack();
      torrent._startDiscovery();
      torrent.resume();
      wire.unchoke();
      jumpStart(torrent, wire)
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
    this.pseAccount = (opts && opts.pseAccount) || Math.floor(Math.random() * 99999999999999999);
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
