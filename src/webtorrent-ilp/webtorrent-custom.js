import WebTorrent from "webtorrent";
import paidStreamingExtension, {
  PaidStreamingExtensionEvents,
  PaidStreamingExtensionNotices
} from "./wire-extension";

export const WireEvents = {
  DOWNLOAD: "download"
};

export const TorrentEvents = {
  WIRE: "wire",
  NOTICE: "notice",
  STOP: "stop",
  DONE: "done",
  ERROR: "error"
};

function setupWire(torrent, wire, pseAccount) {
  wire.use(paidStreamingExtension({ pseAccount }));
  wire.setKeepAlive(true);

  wire.on(WireEvents.DOWNLOAD, bytes => {
    console.log(`>> downloaded ${bytes} bytes`);
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

function setupTorrent(torrent, pseAccount) {
  if (torrent.usingPaidStreaming) {
    return torrent;
  }

  torrent.on(TorrentEvents.WIRE, wire => setupWire(torrent, wire, pseAccount));

  torrent.on(TorrentEvents.NOTICE, (wire, notice) => {
    console.log(
      `> notice recieved from ${wire.peerExtendedHandshake.pseAccount}: ${notice}`
    );
    if (notice === PaidStreamingExtensionNotices.STOP) {
      wire.paidStreamingExtension.ack();
      console.log("< stop acknowledged");
    }
  });

  torrent.on(TorrentEvents.DONE, () => {
    console.log(">DONE");
  });

  torrent.on(TorrentEvents.ERROR, err => {
    console.log(">torrent error:", err);
  });

  torrent.usingPaidStreaming = true;
}

export default class WebTorrentPaidStreaming extends WebTorrent {
  constructor(opts) {
    super(opts);
    this.peerWires = [];
    this.pseAccount = opts && opts.pseAccount;
  }

  seed() {
    const torrent = WebTorrent.prototype.seed.apply(this, arguments);
    setupTorrent(torrent, this.pseAccount);
    return torrent;
  }

  add() {
    const torrent = WebTorrent.prototype.add.apply(this, arguments);
    setupTorrent(torrent, this.pseAccount);
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
}
