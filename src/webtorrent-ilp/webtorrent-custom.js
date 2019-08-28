import WebTorrent from "webtorrent";
import paidStreamingExtension from "./wire-extension";

export default class WebTorrentPaidStreaming extends WebTorrent {
  constructor(opts) {
    super(opts);
    this.peerWires = [];
    this.pseAccount = opts && opts.pseAccount;
  }

  seed() {
    const torrent = WebTorrent.prototype.seed.apply(this, arguments);
    this._setupTorrent(torrent);
    return torrent;
  }

  add() {
    const torrent = WebTorrent.prototype.add.apply(this, arguments);
    this._setupTorrent(torrent);
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

  _setupWire(torrent, wire) {
    wire.use(paidStreamingExtension({ pseAccount: this.pseAccount }));
    wire.setKeepAlive(true);
    wire.on("download", bytes => {
      console.log(`>> downloaded ${bytes} bytes`);
    });
    wire.paidStreamingExtension.on("first_request", () => {
      console.log(
        `> first_request of ${wire.peerExtendedHandshake.pseAccount}`
      );
      wire.emit("first_request", wire.peerExtendedHandshake.pseAccount);
    });
    wire.paidStreamingExtension.on("notice", notice => {
      torrent.emit("notice", wire, notice);
    });
  }

  _setupTorrent(torrent) {
    if (torrent.usingPaidStreaming) {
      return torrent;
    }
    torrent.on("wire", this._setupWire.bind(this, torrent));
    torrent.on("notice", (wire, notice) => {
      console.log(
        `> notice recieved from ${wire.peerExtendedHandshake.pseAccount}: ${notice}`
      );
      if (notice === "stop") {
        wire.paidStreamingExtension.ack();
        console.log("< stop acknowledged");
      }
    });
    torrent.on("done", () => {
      console.log(">DONE");
    });
    torrent.on("error", err => {
      console.log(">torrent error:", err);
    });

    torrent.usingPaidStreaming = true;
  }
}
