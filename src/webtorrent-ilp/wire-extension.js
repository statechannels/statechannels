// @ts-check

import bencode from "bencode";
import { EventEmitter } from "events";

export const PaidStreamingExtensionEvents = {
  WARNING: "warning",
  PSE_HANDSHAKE: "pse_handshake",
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
  const messageBus = new EventEmitter();

  class PaidStreamingExtension {
    get name() {
      return "paidStreamingExtension";
    }

    pseAccount = opts.pseAccount;
    peerAccount = null;
    amForceChoking = false;
    remainingRequests = [];

    constructor(wireToUse) {
      wire = wireToUse;
      wire.extendedHandshake.pseAccount = this.pseAccount;
      this._interceptRequests();
    }

    on(event, callback) {
      messageBus.on(event, callback);
    }

    onHandshake(infoHash, peerId, extensions) {}

    onExtendedHandshake(handshake) {
      if (!handshake.m || !handshake.m[this.name]) {
        return messageBus.emit(
          PaidStreamingExtensionEvents.WARNING,
          new Error("Peer does not support paidStreamingExtension")
        );
      }
      if (handshake.pseAccount) {
        this.peerAccount = handshake.pseAccount;
      }
      messageBus.emit(PaidStreamingExtensionEvents.PSE_HANDSHAKE, {
        pseAccount: this.peerAccount
      });
    }

    stop() {
      this.amForceChoking = true;
      wire.choke();
      wire.extended(
        "paidStreamingExtension",
        bencode.encode({ msg_type: 0, message: "stop" })
      );
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
      wire.extended(
        "paidStreamingExtension",
        bencode.encode({ msg_type: 0, message: "ack" })
      );
    }

    onMessage(buf) {
      let dict;
      let message;
      try {
        const str = buf.toString();
        const trailerIndex = str.indexOf("ee") + 2;
        dict = bencode.decode(str.substring(0, trailerIndex));
        message = new TextDecoder("utf-8").decode(dict.message);
        messageBus.emit(PaidStreamingExtensionEvents.NOTICE, message);
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
          messageBus.emit(PaidStreamingExtensionEvents.FIRST_REQUEST, length);
        }
        messageBus.emit(PaidStreamingExtensionEvents.REQUEST, length);
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
