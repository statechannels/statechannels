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
  wire.use(paidStreamingExtension({ pseAccount: this.pseAccount }));
  wire.setKeepAlive(true);
  wire.setTimeout(65000)
  wire.on('keep-alive', () => {
    wire._clearTimeout()
  });

  wire.on(WireEvents.DOWNLOAD, bytes => {
    console.log(`>> downloaded ${bytes} bytes`);
  });

  wire.once(WireEvents.REQUEST, peerAccount => {
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

/**
 * @this {WebTorrentPaidStreamingClient}
 */
function setupTorrent (torrent) {
  if (torrent.usingPaidStreaming) {
    return torrent;
  }

  torrent.on(TorrentEvents.WIRE, wire => setupWire.call(this, torrent, wire));

  torrent.on(TorrentEvents.NOTICE, (wire, notice) => {
    console.log(`> notice recieved from ${wire.peerExtendedHandshake.pseAccount}: ${notice}`);

    if (notice === PaidStreamingExtensionNotices.STOP) {
      wire.paidStreamingExtension.ack();
      console.log("< stop acknowledged");
    }

    if (notice === PaidStreamingExtensionNotices.START) {
      torrent.destroy(() => this.add(torrent.magnetURI, newTorrent => {
        console.log('>torrent restarted', newTorrent)
        this.emit(ClientEvents.CLIENT_RESET, newTorrent)
      }))
    }

    this.emit(ClientEvents.TORRENT_NOTICE, torrent, wire, notice);
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
