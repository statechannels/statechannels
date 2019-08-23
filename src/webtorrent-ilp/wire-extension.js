
import inherits from "inherits"
import { EventEmitter } from "events"
import bencode from "bencode"
/**
 * Returns a bittorrent extension
 * @param {String} opts.ilp_account Random ID number
 * @return {BitTorrent Extension}
 */
export default function (opts) {
  if (!opts) {
    opts = {}
  }

  inherits(wt_ilp, EventEmitter)

  function wt_ilp (wire) {
    EventEmitter.call(this)

    this._wire = wire
    this.ilp_account = opts.ilp_account
    this.peerAccount = null

    this.amForceChoking = false
    this.remainingRequests = [];
    this._wire.extendedHandshake.ilp_account = opts.ilp_account
    console.log('Extended handshake to send:', this._wire, this._wire.extendedHandshake)
    this._interceptRequests()
  }

  wt_ilp.prototype.name = 'wt_ilp'

  wt_ilp.prototype.onHandshake = function (infoHash, peerId, extensions) { }
  wt_ilp.prototype.onExtendedHandshake = function (handshake) {
    if (!handshake.m || !handshake.m.wt_ilp) {
      return this.emit('warning', new Error('Peer does not support wt_ilp'))
    }
    if (handshake.ilp_account) { this.peerAccount = handshake.ilp_account }
    this.emit('ilp_handshake', { ilp_account: this.peerAccount })
  }

  wt_ilp.prototype.stop = function () {
    this.amForceChoking = true
    this._wire.choke()
    this._wire.extended('wt_ilp', bencode.encode({ msg_type: 0, message: "stop" }))
  }

  wt_ilp.prototype.start = function () {
    this.amForceChoking = false;
    this._wire.unchoke()
    this._wire.extended('wt_ilp', bencode.encode({ msg_type: 0, message: "start" }))
  }
  wt_ilp.prototype.ack = function () {
    this._wire.extended('wt_ilp', bencode.encode({ msg_type: 0, message: "ack" }))
  }
  
  wt_ilp.prototype.onMessage = function (buf) {
    let dict
    let message;
    try {
      const str = buf.toString()
      const trailerIndex = str.indexOf('ee') + 2
      dict = bencode.decode(str.substring(0, trailerIndex))
      message = new TextDecoder("utf-8").decode(dict.message)
      this.emit("notice", message)
    } catch (err) {
      console.error("err", err)
      // drop invalid messages
      return
    }
  }

  wt_ilp.prototype._interceptRequests = function () {
    const _this = this
    const _onRequest = this._wire._onRequest
    this._wire._onRequest = function (index, offset, length) {
      if (!index && !offset) {
        _this.emit('first_request', length)
      }
      _this.emit('request', length)

      // Call onRequest after the handlers triggered by this event have been called
      const _arguments = arguments
      setTimeout(function () {
        if (!_this.amForceChoking) {
          console.log('wt_ilp responding to request')
          _onRequest.apply(_this._wire, _arguments)
        } else {
          console.warn('force choking peer, dropping request')
        }
      }, 0)
    }
  }
  

  return wt_ilp
}