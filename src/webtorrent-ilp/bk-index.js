'use strict'

import wt_ilp from 'wt_ilp'
import moment from 'moment'
import BigNumber from 'bignumber.js'
import WalletClient from 'five-bells-wallet-client'
import Debug from 'debug'
const debug = Debug('WebTorrentIlp')
import Decider from './decider'
import uuid from 'uuid'
import WebTorrent from 'webtorrent'

export default class WebTorrentIlp extends WebTorrent {
  constructor (opts) {
    super(opts)

    this.address = opts.address
    this.password = opts.password
    this.price = new BigNumber(opts.price) // price per kb
    debug('set price per kb: ' + this.price.toString())
    this.publicKey = opts.publicKey

    this.startingBid = opts.startingBid || this.price.times(100)
    this.bidDecreaseFactor = opts.bidDecreaseFactor || 0.95
    this.bidIncreaseFactor = opts.bidIncreaseFactor || 2

    this.decider = new Decider()

    this.walletClient = new WalletClient({
      address: opts.address,
      password: opts.password
    })
    this.walletClient.connect()
      .then(() => this.emit('wallet_ready'))
    this.walletClient.on('incoming', this._handleIncomingPayment.bind(this))

    // <peerPublicKey>: <balance>
    this.peerBalances = {}
    // <peerPublicKey>: <[wire, wire]>
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

  _getPeerBalance (wire) {
    const peerPublicKey = wire.wt_ilp.peerPublicKey
    return this.peerBalances[peerPublicKey] || new BigNumber(0)
  }

  _checkUnchokeWire (wire) {
    // Check they have enough balance if we're seeding to them
    if (this._getPeerBalance(wire).lessThanOrEqualTo(0)) {
      return
    }

    wire.wt_ilp.unchoke()
  }

  _setupWire (torrent, wire) {
    wire.bidAmount = this.price.times(this.startingBid)
    debug('starting bid amount: ' + wire.bidAmount.toString())

    wire.use(wt_ilp({
      account: this.walletClient.accountUri,
      publicKey: this.publicKey
    }))
    wire.wt_ilp.on('ilp_handshake', (handshake) => {
      debug('Got extended handshake', handshake)
      if (!this.peerWires[handshake.publicKey]) {
        this.peerWires[handshake.publicKey] = []
      }
      this.peerWires[handshake.publicKey].push(wire)
    })

    // Charge peers for requesting data from us
    wire.wt_ilp.on('request', this._chargePeerForRequest.bind(this, wire, torrent))
    wire.wt_ilp.on('payment_request_too_high', (amount) => {
      debug('Got payment_request_too_high' + (amount ? ' ' + amount : ''))
      wire.bidAmount = wire.bidAmount.times(this.bidDecreaseFactor)
    })

    // Pay peers who we are downloading from
    wire.wt_ilp.on('payment_request', this._payPeer.bind(this, wire, torrent))

    wire.on('download', (bytes) => {
      debug('downloaded ' + bytes + ' bytes (' + wire.wt_ilp.peerPublicKey.slice(0, 8) + ')')
      this.decider.recordDelivery({
        publicKey: wire.wt_ilp.peerPublicKey,
        torrentHash: torrent.infoHash,
        bytes: bytes,
        timestamp: moment().toISOString()
      })
    })

    wire.wt_ilp.on('warning', (err) => {
      debug('Error', err)
    })

    wire.wt_ilp.forceChoke()
  }

  _setupTorrent (torrent) {
    if (torrent.__setupWithIlp) {
      return torrent
    }

    debug('Setting up torrent with ILP details')

    torrent.totalCost = new BigNumber(0)

    torrent.on('wire', this._setupWire.bind(this, torrent))

    torrent.on('done', () => {
      debug('torrent total cost: ' + this.decider.getTotalSent({
        torrentHash: torrent.infoHash
      }))
    })

    torrent.on('error', (err) => {
      debug('torrent error:', err)
    })

    torrent.__setupWithIlp = true
  }

  _chargePeerForRequest (wire, torrent, bytesRequested) {
    const peerPublicKey = wire.wt_ilp.peerPublicKey
    const peerBalance = this._getPeerBalance(wire)

    // TODO get smarter about how we price the amount (maybe based on torrent rarity?)
    const amountToCharge = this.price.times(bytesRequested / 1000)
    debug('peer request costs: ' + amountToCharge.toString())

    if (peerBalance.greaterThan(amountToCharge)) {
      const newBalance = peerBalance.minus(amountToCharge)
      this.peerBalances[wire.wt_ilp.peerPublicKey] = newBalance
      debug('charging ' + amountToCharge.toString() + ' for request. balance now: ' + newBalance + ' (' + peerPublicKey.slice(0, 8) + ')')
      wire.wt_ilp.unchoke()
    } else {
      // TODO @tomorrow add bidding agent to track how much peer is willing to send at a time

      // If the amount we request up front is too low, the peer will send us money
      // then we won't do anything because it'll be less than the amountToCharge
      // and then they'll never send us anything again
      if (!wire.bidAmount || amountToCharge.greaterThan(wire.bidAmount)) {
        wire.bidAmount = amountToCharge
      }

      // TODO base the precision on the ledger amount
      wire.bidAmount = wire.bidAmount.round(4, BigNumber.ROUND_UP)

      // TODO handle the min ledger amount more elegantly
      const MIN_LEDGER_AMOUNT = '0.0001'
      wire.wt_ilp.sendPaymentRequest(BigNumber.max(wire.bidAmount, MIN_LEDGER_AMOUNT))
      wire.wt_ilp.forceChoke()
    }
  }

  _payPeer (wire, torrent, destinationAmount) {
    const _this = this
    const destinationAccount = wire.wt_ilp.peerAccount
    debug('pay peer ' + destinationAccount + ' ' + destinationAmount)
    // Convert the destinationAmount into the sourceAmount

    const payment = this.walletClient.payment({
      destinationAccount: destinationAccount,
      destinationAmount: destinationAmount,
      message: _this.publicKey
    })
    return payment.quote()
    // Decide if we should pay
    .then((params) => {
      const paymentRequest = {
        sourceAmount: params.sourceAmount,
        destinationAccount: destinationAccount,
        publicKey: wire.wt_ilp.peerPublicKey,
        torrentHash: torrent.infoHash,
        torrentBytesRemaining: torrent.length - torrent.downloaded,
        timestamp: moment().toISOString()
      }
      return {
        decision: _this.decider.shouldSendPayment(paymentRequest),
        paymentRequest
      }
    })
    // Send payment
    .then(({ decision, paymentRequest }) => {
      if (decision === true) {
        const paymentId = uuid.v4()

        // TODO track stats like this in a better way
        torrent.totalCost = torrent.totalCost.plus(paymentRequest.sourceAmount)

        _this.decider.recordPayment({
          ...paymentRequest,
          paymentId
        })
        debug('About to send payment: %o', payment)
        _this.emit('outgoing_payment', {
          peerPublicKey: paymentRequest.publicKey,
          amount: paymentRequest.sourceAmount.toString()
        })
        payment.send()
          .then((result) => debug('Sent payment %o', result))
          .catch((err) => {
            // If there was an error, subtract the amount from what we've paid them
            // TODO make sure we actually didn't pay them anything
            debug('Error sending payment %o', err)
            _this.decider.recordFailedPayment(paymentId, err)
          })
      } else {
        debug('Decider told us not to fulfill request %o', paymentRequest)
        wire.wt_ilp.sendPaymentRequestTooHigh()
      }
    })
  }

  _handleIncomingPayment (incoming) {
    const peerPublicKey = incoming.message
    if (!peerPublicKey) {
      return
    }
    const previousBalance = this.peerBalances[peerPublicKey] || new BigNumber(0)
    const newBalance = previousBalance.plus(incoming.destinationAmount)
    debug('Crediting peer for payment of: ' + incoming.destinationAmount + '. balance now: ' + newBalance + ' (' + peerPublicKey.slice(0, 8) + ')')
    this.peerBalances[peerPublicKey] = newBalance
    this.emit('incoming_payment', {
      peerPublicKey: peerPublicKey,
      amount: incoming.destinationAmount
    })

    // Unchoke all of this peer's wires
    for (let wire of this.peerWires[peerPublicKey]) {
      wire.unchoke()
      wire.bidAmount = wire.bidAmount.times(this.bidIncreaseFactor)
      this._checkUnchokeWire(wire)
    }
  }
}

// Note that using module.exports instead of export const here is a hack
// to make this work with https://github.com/59naga/babel-plugin-add-module-exports
module.exports.WEBRTC_SUPPORT = WebTorrent.WEBRTC_SUPPORT