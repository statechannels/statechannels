// @ts-check

import bencode from "bencode";
import { EventEmitter } from "events";

export const PaidStreamingExtensionEvents = {
  WARNING: "warning",
  ILP_HANDSHAKE: "ilp_handshake",
  NOTICE: "notice",
  FIRST_REQUEST: "first_request",
  REQUEST: "request"
};

export const PaidStreamingExtensionNotices = {
  START: "start",
  STOP: "stop",
  ACK: "ack"
};

/**
 * Returns a bittorrent extension
 * @param {Object} opts
 * @param {String} [opts.pseAccount] Random ID number
 * @return {typeof PaidStreamingExtension}
 */
export default function usePaidStreamingExtension(opts = {}) {
  let wire = null;

  class PaidStreamingExtension extends EventEmitter {
    get name() {
      return "paidStreamingExtension";
    }

    ilp_account = opts.pseAccount;
    peerAccount = null;
    amForceChoking = false;
    remainingRequests = [];

    constructor(wireToUse) {
      super();
      wire = wireToUse;
      wire.extendedHandshake.ilp_account = this.ilp_account;
      this._interceptRequests();
    }

    onHandshake(infoHash, peerId, extensions) {}

    onExtendedHandshake(handshake) {
      if (!handshake.m || !handshake.m[this.name]) {
        return this.emit(
          PaidStreamingExtensionEvents.WARNING,
          new Error("Peer does not support paidStreamingExtension")
        );
      }
      if (handshake.ilp_account) {
        this.peerAccount = handshake.ilp_account;
      }
      this.emit(PaidStreamingExtensionEvents.ILP_HANDSHAKE, {
        ilp_account: this.peerAccount
      });
    }

    stop() {
      this.amForceChoking = true;
      wire.choke();
      wire.extended("paidStreamingExtension", bencode.encode({ msg_type: 0, message: "stop" }));
    }

    start() {
      this.amForceChoking = false;
      wire.unchoke();
      wire.extended(
        "paidStreamingExtension",
        bencode.encode({ msg_type: 0, message: "start" })
      );
    }

    ack() {
      wire.extended("paidStreamingExtension", bencode.encode({ msg_type: 0, message: "ack" }));
    }

    onMessage(buf) {
      let dict;
      let message;
      try {
        const str = buf.toString();
        const trailerIndex = str.indexOf("ee") + 2;
        dict = bencode.decode(str.substring(0, trailerIndex));
        message = new TextDecoder("utf-8").decode(dict.message);
        this.emit(PaidStreamingExtensionEvents.NOTICE, message);
      } catch (err) {
        console.error("err", err);
        // drop invalid messages
        return;
      }
    }

    _interceptRequests() {
      const _this = this;
      const _onRequest = wire._onRequest;
      wire._onRequest = function(index, offset, length) {
        if (!index && !offset) {
          _this.emit(PaidStreamingExtensionEvents.FIRST_REQUEST, length);
        }
        _this.emit("request", length);
        // Call onRequest after the handlers triggered by this event have been called
        const _arguments = arguments;
        setTimeout(function() {
          if (!_this.amForceChoking) {
            _onRequest.apply(wire, _arguments);
          } else {
            console.warn(">> CHOKING - dropped request");
          }
        }, 0);
      };
    }
  }

  return PaidStreamingExtension;
}
