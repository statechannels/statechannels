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

  sendNotice (torrent, wire) {
    wire.wt_ilp.stop();
    console.log('<sendNotice', wire.peerId)

    // wire.choke()
    // torrent.removePeer(wire.peerId);
  }

  retractNotice (torrent, wire, peerId) {
    wire.wt_ilp.start();
    console.log('>retractNotice', wire.peerId)

    // wire.unchoke()
    // torrent.addPeer(peerId);
  }

  _setupWire (torrent, wire) {
    wire.use(wt_ilp({ ilp_account: this.ilp_account }))
    wire.setKeepAlive(true)

    wire.on('download', (bytes) => { console.log('CUSTOM downloaded ' + bytes + ' bytes') })
    wire.on('unchoke', () => { console.log('CUSTOM unchoke') })
    wire.wt_ilp.on('first_request', () => {
      console.log('CUSTOM MMMMM', wire);
      torrent.emit('first_request', wire);
      wire.emit('first_request', wire.extendedHandshake.ilp_account);
    })

    wire.wt_ilp.on('notice', (notice) => {
      torrent.emit('notice', wire, notice);
    })
    wire.wt_ilp.on('ilp_choke', () => { console.log('CUSTOM wt_ilp choke') })
    wire.wt_ilp.on('ilp_unchoke', () => { console.log('CUSTOM wt_ilp unchoke') })
  }

  _setupTorrent (torrent) {
    if (torrent.__setupWithIlp) { return torrent }
    torrent.on('wire', this._setupWire.bind(this, torrent))
    torrent.on('first_request', (wire) => { console.log('SETUP torrent first_request', wire) })
    torrent.on('notice', (wire, notice) => {
      console.log('SETUP notice', wire, notice)
      if (notice === 'stop') {
        wire.wt_ilp.ack();
        console.log("<ack'ed")
      }
    })
    torrent.on('done', () => { console.log('DONE') })
    torrent.on('error', (err) => { console.log('torrent error:', err) })

    torrent.__setupWithIlp = true
  }
}
