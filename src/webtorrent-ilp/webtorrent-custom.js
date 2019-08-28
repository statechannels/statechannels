import WebTorrent from "webtorrent";
import paidStreamingExtension, {
  PaidStreamingExtensionEvents,
  PaidStreamingExtensionNotices
} from "./wire-extension";

export const WireEvents = {
  DOWNLOAD: "download",
  FIRST_REQUEST: "first_request"
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
  TORRENT_ERROR: "torrent_error"
};

/**
 * @this {WebTorrentPaidStreamingClient}
 */
function setupWire(torrent, wire) {
  wire.use(paidStreamingExtension({ pseAccount: this.pseAccount }));
  wire.setKeepAlive(true);

  wire.on(WireEvents.DOWNLOAD, bytes => {
    console.log(`>> downloaded ${bytes} bytes`);
  });

  wire.on(WireEvents.FIRST_REQUEST, peerAccount => {
    if (
      peerAccount in this.allowedPeers &&
      !this.allowedPeers[peerAccount].allowed
    ) {
      this.sendNotice(wire, peerAccount);
    } else {
      const newAllowedPeer = {
        id: peerAccount,
        allowed: true,
        wire
      };
      this.allowedPeers[peerAccount] = newAllowedPeer;
      this.emit(ClientEvents.PEER_STATUS_CHANGED, newAllowedPeer);
    }
  });

  wire.paidStreamingExtension.on(
    PaidStreamingExtensionEvents.FIRST_REQUEST,
    () => {
      console.log(
        `> first_request of ${wire.peerExtendedHandshake.pseAccount}`
      );
      wire.emit(
        PaidStreamingExtensionEvents.FIRST_REQUEST,
        wire.peerExtendedHandshake.pseAccount
      );
    }
  );

  wire.paidStreamingExtension.on(
    PaidStreamingExtensionEvents.NOTICE,
    notice => {
      torrent.emit(PaidStreamingExtensionEvents.NOTICE, wire, notice);
    }
  );
}

/**
 * @this {WebTorrentPaidStreamingClient}
 */
function setupTorrent(torrent) {
  if (torrent.usingPaidStreaming) {
    return torrent;
  }

  torrent.on(TorrentEvents.WIRE, wire => setupWire.call(this, torrent, wire));

  torrent.on(TorrentEvents.NOTICE, (wire, notice) => {
    console.log(
      `> notice recieved from ${wire.peerExtendedHandshake.pseAccount}: ${notice}`
    );

    if (notice === PaidStreamingExtensionNotices.STOP) {
      wire.paidStreamingExtension.ack();
      console.log("< stop acknowledged");
    }

    if (notice === PaidStreamingExtensionNotices.START) {
      /**
       * @todo This should use choking/unchoking.
       */
      this.destroy();
      const newClient = new WebTorrentPaidStreamingClient({
        pseAccount: this.pseAccount
      });
      this.emit(ClientEvents.CLIENT_RESET, newClient);
    }
  });

  torrent.on(TorrentEvents.DONE, () => {
    console.log(">DONE");
    this.emit(ClientEvents.TORRENT_DONE, torrent);
  });

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
  }

  seed() {
    const torrent = super.seed.apply(this, arguments);
    setupTorrent.call(this, torrent);
    return torrent;
  }

  add() {
    const torrent = super.add.apply(this, arguments);
    setupTorrent.call(this, torrent);
    return torrent;
  }

  sendNotice(wire, peerAccount) {
    wire.paidStreamingExtension.stop();
    console.log("> sendNotice", peerAccount);
  }

  retractNotice(wire, peerAccount) {
    wire.paidStreamingExtension.start();
    console.log("> retractNotice", peerAccount);
  }

  togglePeer(peerAccount) {
    const { wire, allowed } = this.allowedPeers[peerAccount];
    if (allowed) {
      this.sendNotice(wire, peerAccount);
    } else {
      this.retractNotice(wire, peerAccount);
    }
    this.allowedPeers[peerAccount].allowed = !allowed;
    this.emit(ClientEvents.PEER_STATUS_CHANGED, this.allowedPeers[peerAccount]);
  }
}
