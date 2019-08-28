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

  function executeExtensionCommand(extension, wire, command) {
    wire.extended(extension, bencode.encode({ msg_type: 0, message: command }));
  }

  function interceptRequests(extension) {
    const undecoratedOnRequestFunction = wire._onRequest;

    wire._onRequest = function(index, offset, length) {
      if (!index && !offset) {
        messageBus.emit(PaidStreamingExtensionEvents.FIRST_REQUEST, length);
      }

      messageBus.emit(PaidStreamingExtensionEvents.REQUEST, length);

      // Call onRequest after the handlers triggered by this event have been called
      const undecoratedOnRequestFunctionArgs = arguments;

      setTimeout(() => {
        if (!extension.isForceChoking) {
          undecoratedOnRequestFunction.apply(
            wire,
            undecoratedOnRequestFunctionArgs
          );
        } else {
          console.warn(">> CHOKING - dropped request");
        }
      }, 0);
    };
  }

  class PaidStreamingExtension {
    get name() {
      return "paidStreamingExtension";
    }

    pseAccount = opts.pseAccount;
    peerAccount = null;
    isForceChoking = false;
    remainingRequests = [];

    constructor(wireToUse) {
      wire = wireToUse;
      wire.extendedHandshake.pseAccount = this.pseAccount;
      interceptRequests(this);
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
      this.isForceChoking = true;
      wire.choke();
      executeExtensionCommand(
        this.name,
        wire,
        PaidStreamingExtensionNotices.STOP
      );
    }

    start() {
      this.isForceChoking = false;
      wire.unchoke();
      executeExtensionCommand(
        this.name,
        wire,
        PaidStreamingExtensionNotices.START
      );
    }

    ack() {
      executeExtensionCommand(
        this.name,
        wire,
        PaidStreamingExtensionNotices.ACK
      );
    }

    onMessage(buffer) {
      try {
        const stringBuffer = buffer.toString();
        const trailerIndex = stringBuffer.indexOf("ee") + 2;
        const jsonData = bencode.decode(
          stringBuffer.substring(0, trailerIndex)
        );
        const notice = new TextDecoder("utf-8").decode(jsonData.message);
        messageBus.emit(PaidStreamingExtensionEvents.NOTICE, notice);
      } catch (err) {
        console.error("err", err);
      }
    }
  }

  return PaidStreamingExtension;
}
