
import inherits from "inherits"
import {EventEmitter} from "events"

/**
 * Returns a bittorrent extension
 * @param {String} opts.account Random ID number
 * @return {BitTorrent Extension}
 */
export default function (opts) {
  if (!opts) {
    opts = {}
  }

  inherits(wt_ilp, EventEmitter)

  function wt_ilp (wire) {
    EventEmitter.call(this)

    console.log('wt_ilp instantiated')

    this._wire = wire

    // Peer fields will be set once the extended handshake is received
    this.peerAccount = null

    this.amForceChoking = false

    // Add fields to extended handshake, which will be sent to peer
    this._wire.extendedHandshake.ilp_account = this.account


    console.log('Extended handshake to send:', this._wire.extendedHandshake)

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

    if (handshake.ilp_account) {
      this.peerAccount = handshake.ilp_account.toString('utf8')
    }

    this.emit('ilp_handshake', {
      account: this.peerAccount
    })
  }

  wt_ilp.prototype.forceChoke = function () {
    console.log('force choke peer' + (this.peerAccount ? ' (' + this.peerAccount + ')' : ''))
    this.amForceChoking = true
    this._wire.choke()
  }

  wt_ilp.prototype.unchoke = function () {
    console.log('unchoke' + (this.peerAccount ? ' (' + this.peerAccount + ')' : ''))
    this.amForceChoking = false
  }

  wt_ilp.prototype._interceptRequests = function () {
    const _this = this
    const _onRequest = this._wire._onRequest
    this._wire._onRequest = function (index, offset, length) {
      _this.emit('request', length)

      // Call onRequest after the handlers triggered by this event have been called
      const _arguments = arguments
      setTimeout(function () {
        if (!_this.amForceChoking) {
          console.log('responding to request')
          _onRequest.apply(_this._wire, _arguments)
        } else {
          console.log('force choking peer, dropping request')
        }
      }, 0)
    }
  }

  return wt_ilp
}