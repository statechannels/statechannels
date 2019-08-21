'use strict'

const EventEmitter = require('events').EventEmitter
const inherits = require('inherits')
const bencode = require('bencode')
const debug = require('debug')('wt_ilp')

/**
 * Returns a bittorrent extension
 * @param {String} opts.account Address of five-bells-wallet
 * @param {String} opts.publicKey Ed25519 public key
 * @param {String} [opts.license] payment-license
 * @return {BitTorrent Extension}
 */
module.exports = function (opts) {
  if (!opts) {
    opts = {}
  }

  inherits(wt_ilp, EventEmitter)

  function wt_ilp (wire) {
    EventEmitter.call(this)

    debug('wt_ilp instantiated')

    this._wire = wire

    this.publicKey = opts.publicKey
    this.account = opts.account
    this.license = opts.license

    if (!this.publicKey) {
      throw new Error('Must instantiate wt_ilp with a publicKey')
    }
    if (!this.account) {
      throw new Error('Must instantiate wt_ilp with an ILP account')
    }

    // Peer fields will be set once the extended handshake is received
    this.peerAccount = null
    this.peerPublicKey = null
    this.peerLicense = null

    this.amForceChoking = false

    // Add fields to extended handshake, which will be sent to peer
    this._wire.extendedHandshake.ilp_public_key = this.publicKey
    this._wire.extendedHandshake.ilp_account = this.account
    if (this.license) {
      this._wire.extendedHandshake.ilp_license = this.license
    }

    debug('Extended handshake to send:', this._wire.extendedHandshake)

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
    if (handshake.ilp_public_key) {
      this.peerPublicKey = handshake.ilp_public_key.toString('utf8')
    }
    if (handshake.ilp_license) {
      this.peerLicense = handshake.ilp_license.toString('utf8')
    }

    this.emit('ilp_handshake', {
      account: this.peerAccount,
      publicKey: this.peerPublicKey,
      license: this.peerLicense
    })
  }

  wt_ilp.prototype.onMessage = function (buf) {
    let dict
    try {
      const str = buf.toString()
      const trailerIndex = str.indexOf('ee') + 2
      dict = bencode.decode(str.substring(0, trailerIndex))
    } catch (err) {
      // drop invalid messages
      return
    }
    const amount = Buffer.isBuffer(dict.amount) ? dict.amount.toString('utf8') : 0
    switch (dict.msg_type) {
      // request for funds (denominated in the peer's ledger's asset)
      // { msg_type: 0, amount: 10 }
      case 0:
        debug('Got payment request for: ' + amount + (this.peerPublicKey ? ' (' + this.peerPublicKey.slice(0, 8) + ')' : ''))
        this.emit('payment_request', amount)
        break
      case 1:
        debug('Peer is complaining that the price is too high, suggested price: ' + amount)
        this.emit('payment_request_too_high', amount)
        break
      case 2:
        const license = dict.license.toString('utf8')
        debug('Got peer license: ' + dict.license.toString('utf8'))
        this.peerLicense = license
        this.emit('license', license)
        break
      default:
        debug('Got unknown message: ', dict)
        break
    }
  }

  wt_ilp.prototype.forceChoke = function () {
    debug('force choke peer' + (this.peerPublicKey ? ' (' + this.peerPublicKey.slice(0, 8) + ')' : ''))
    this.amForceChoking = true
    this._wire.choke()
  }

  wt_ilp.prototype.unchoke = function () {
    debug('unchoke' + (this.peerPublicKey ? ' (' + this.peerPublicKey.slice(0, 8) + ')' : ''))
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
          debug('responding to request')
          _onRequest.apply(_this._wire, _arguments)
        } else {
          debug('force choking peer, dropping request')
        }
      }, 0)
    }
  }

  wt_ilp.prototype._send = function (dict) {
    this._wire.extended('wt_ilp', bencode.encode(dict))
  }

  wt_ilp.prototype.sendPaymentRequest = function (amount) {
    debug('Send payment request for: ' + amount.toString() + (this.peerPublicKey ? ' (' + this.peerPublicKey.slice(0, 8) + ')' : ''))
    this._send({
      msg_type: 0,
      amount: amount.toString()
    })
  }

  wt_ilp.prototype.sendPaymentRequestTooHigh = function (amount) {
    if (!amount) {
      amount = 0
    }
    debug('Telling peer price is too high, suggesting price: ' + amount.toString())
    this._send({
      msg_type: 1,
      amount: amount.toString()
    })
  }

  wt_ilp.prototype.sendLicense = function (license) {
    debug('Sending license: ' + license)
    this._send({
      msg_type: 2,
      license: license
    })
  }

  return wt_ilp
}