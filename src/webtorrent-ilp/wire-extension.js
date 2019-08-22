
import inherits from "inherits"
import { EventEmitter } from "events"

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
    // Peer fields will be set once the extended handshake is received
    this.peerAccount = null

    this.amForceChoking = false
    this.remainingRequests = [];
    // Add fields to extended handshake, which will be sent to peer
    this._wire.extendedHandshake.ilp_account = opts.ilp_account


    console.log('Extended handshake to send:', this._wire, this._wire.extendedHandshake)

    this._interceptRequests()
  }

  wt_ilp.prototype.name = 'wt_ilp'

  wt_ilp.prototype.onHandshake = function (infoHash, peerId, extensions) {
    // noop
  }

  wt_ilp.prototype.onExtendedHandshake = function (handshake) {
    if (!handshake.m || !handshake.m.wt_ilp) {
      return this.emit('warning', new Error('Peer does not support wt_ilp'))
    }
    console.log('handshake', handshake)
    if (handshake.ilp_account) {
      this.peerAccount = handshake.ilp_account
    }

    this.emit('ilp_handshake', {
      ilp_account: this.peerAccount
    })
  }
  function deepClone (stuff) {
    return JSON.parse(JSON.stringify(stuff))
  }

  wt_ilp.prototype.forceChoke = function () {
    this.amForceChoking = true
    this.remainingRequests = JSON.parse(JSON.stringify(this._wire.peerPieces));
    this._wire.choke()
    this._wire.emit("choke")
    console.log('wt_ilp choke', this._wire)
  }

  wt_ilp.prototype.forceUnchoke = function () {
    this._wire.unchoke()
    this.amForceChoking = false
    this._wire.wt_ilp.amForceChoking = false;
    this._wire.emit("unchoke")
    console.log('wt_ilp unchoke', this._wire)
  }

  wt_ilp.prototype._interceptRequests = function () {
    const _this = this
    const _onRequest = this._wire._onRequest
    this._wire._onRequest = function (index, offset, length) {
      _this.emit('request', length)
      console.log('intercepted', index, offset, length)
      // Call onRequest after the handlers triggered by this event have been called
      const _arguments = arguments
      console.log("_interceptRequests _arguments", _arguments)
      setTimeout(function () {
        if (!_this.amForceChoking) {
          console.log('responding to request')
          _onRequest.apply(_this._wire, _arguments)
        } else {
          console.warn('force choking peer, dropping request')
        }
      }, 0)
    }
  }

  return wt_ilp
}