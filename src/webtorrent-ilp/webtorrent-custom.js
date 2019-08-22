import WebTorrent from 'webtorrent'
import wireExt from './wire-extension'

export default class WebTorrentIlp extends WebTorrent {
  constructor(opts) {
    super(opts)
    this.peerBalances = {}
    this.peerWires = []
    this.ilp_account = Math.trunc(Math.random() * 10000000000);
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

  unchokeWire (peerWires) {
    for (let i = 0; i < this.peerWires.length; i++) {
      const wire = this.peerWires[i];
      console.log('unchokeWire', wire, wire && wire.wt_ilp)
      wire.wt_ilp.forceUnchoke()
    }
  }

  chokeWire (wire) {
    wire.wt_ilp.forceChoke()
  }

  _setupWire (torrent, wire) {
    wire.setKeepAlive(true)
    wire.use(wireExt({ ilp_account: this.ilp_account }))

    wire.wt_ilp.on('ilp_handshake', (handshake) => {
      console.log('Got extended handshake', handshake)
      this.peerWires.push(wire);
      wire.wt_ilp.forceChoke()
    })

    wire.on('download', (bytes) => {
      console.log('downloaded ' + bytes + ' bytes', wire)
    })
    
    // wire.wt_ilp.on('unchoke', () => {
    //   console.log('unchokeunchokeunchokeunchokeunchokeunchoke')
    // })

    wire.wt_ilp.on('warning', (err) => {
      console.log('Error', err)
    })
    
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