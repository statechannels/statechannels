import WebTorrent from 'webtorrent'
import wireExt from './wire-extension'

export default class WebTorrentIlp extends WebTorrent {
  constructor(opts) {
    super(opts)
    this.peerBalances = {}
    this.peerWires = {}
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

  _checkUnchokeWire (wire) {
    wire.wt_ilp.unchoke()
  }

  _setupWire (torrent, wire) {
    wire.use(wireExt({ account: Math.trunc(Math.random() * 10000000000) }))
    
    wire.wt_ilp.on('ilp_handshake', (handshake) => {
      console.log('Got extended handshake', handshake)
      if (!this.peerWires[handshake.account]) {
        this.peerWires[handshake.account] = []
      }
      this.peerWires[handshake.account].push(wire)
    })

    wire.on('download', (bytes) => {
      console.log('downloaded ' + bytes + ' bytes (' + wire.wt_ilp.account + ')')
      console.log("recordDelivery", {
        account: wire.wt_ilp.account,
        torrentHash: torrent.infoHash,
        bytes: bytes,
        timestamp: Date.now()
      });
    })

    wire.wt_ilp.on('warning', (err) => {
      console.log('Error', err)
    })

    wire.wt_ilp.forceChoke()
  }

  _setupTorrent (torrent) {
    if (torrent.__setupWithIlp) {
      return torrent
    }

    torrent.on('wire', this._setupWire.bind(this, torrent))

    torrent.on('done', () => { console.log('DONE') })

    torrent.on('error', (err) => { console.log('torrent error:', err) })

    torrent.__setupWithIlp = true
  }
}

// Note that using module.exports instead of export const here is a hack
// to make this work with https://github.com/59naga/babel-plugin-add-module-exports
// module.exports.WEBRTC_SUPPORT = WebTorrent.WEBRTC_SUPPORT