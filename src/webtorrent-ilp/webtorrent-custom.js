import WebTorrent from 'webtorrent'
import wt_ilp from './wire-extension'

export default class WebTorrentIlp extends WebTorrent {
  constructor(opts) {
    super(opts)
    this.peerWires = []
    this.ilp_account = opts && opts.ilp_acccount;
  }

  seed () {
    const torrent = WebTorrent.prototype.seed.apply(this, arguments)
    this._setupTorrent(torrent)
    return torrent
  }

  add () {
    const torrent = WebTorrent.prototype.add.apply(this, arguments)
    this._setupTorrent(torrent)
    return torrent
  }

  sendNotice (wire, peerAccount) {
    wire.wt_ilp.stop();
    console.log('> sendNotice', peerAccount)

  }

  retractNotice (wire, peerAccount) {
    wire.wt_ilp.start();
    console.log('> retractNotice', peerAccount)
  }

  _setupWire (torrent, wire) {
    wire.use(wt_ilp({ ilp_account: this.ilp_account }))
    wire.setKeepAlive(true)
    wire.on('download', (bytes) => { console.log(`>> downloaded ${bytes} bytes`) })
    wire.wt_ilp.on('first_request', () => {
      console.log(`> first_request of ${wire.peerExtendedHandshake.ilp_account}`);
      wire.emit('first_request', wire.peerExtendedHandshake.ilp_account);
    })
    wire.wt_ilp.on('notice', (notice) => { torrent.emit('notice', wire, notice); })
  }

  _setupTorrent (torrent) {
    if (torrent.__setupWithIlp) { return torrent }
    torrent.on('wire', this._setupWire.bind(this, torrent))
    torrent.on('notice', (wire, notice) => {
      console.log(`> notice recieved from ${wire.peerExtendedHandshake.ilp_account}: ${notice}`)
      if (notice === 'stop') {
        wire.wt_ilp.ack();
        console.log("< stop acknowledged")
      }
    })
    torrent.on('done', () => { console.log('>DONE') })
    torrent.on('error', (err) => { console.log('>torrent error:', err) })

    torrent.__setupWithIlp = true
  }
}
