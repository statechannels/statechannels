// @ts-check

import bencode from "bencode";
import { EventEmitter } from "events";
import { PaidStreamingExtensionEvents, PaidStreamingExtensionNotices } from "./constants";

/**
 * Returns a bittorrent extension
 * @param {Object} opts
 * @param {String} [opts.pseAccount] Random ID number
 * @return {typeof PaidStreamingExtension}
 */
export default function usePaidStreamingExtension (opts = {}) {
  let wire = null;
  const messageBus = new EventEmitter();

  function executeExtensionCommand (extension, wire, command, data = {}) {
    wire.extended(extension, bencode.encode({ msg_type: 0, command, data }));
  }

  function interceptRequests (extension) {
    const undecoratedOnRequestFunction = wire._onRequest;

    wire._onRequest = function () {
      console.log(`!> Incoming request for piece ${arguments[0]}`);

      messageBus.emit(PaidStreamingExtensionEvents.REQUEST, wire.paidStreamingExtension && wire.paidStreamingExtension.peerAccount);

      // Call onRequest after the handlers triggered by this event have been called
      const undecoratedOnRequestFunctionArgs = arguments;

      setTimeout(() => {
        if (!extension.isForceChoking) {
          extension.blockedRequests = []
          undecoratedOnRequestFunction.apply(
            wire,
            undecoratedOnRequestFunctionArgs
          );
        } else {
          extension.blockedRequests.push(undecoratedOnRequestFunctionArgs[0])
          console.warn("!> CHOKING - dropped request", extension.blockedRequests);
        }
      }, 0);
    };
  }

  class PaidStreamingExtension {
    get name () {
      return "paidStreamingExtension";
    }

    pseAccount = opts.pseAccount;
    peerAccount = null;
    isForceChoking = false;
    blockedRequests = [];

    constructor(wireToUse) {
      wire = wireToUse;
      wire.extendedHandshake.pseAccount = this.pseAccount;
      interceptRequests(this);
    }

    on (event, callback) {
      messageBus.on(event, callback);
    }

    once (event, callback) {
      messageBus.once(event, callback);
    }

    onHandshake (/* infoHash, peerId, extensions */) { }

    onExtendedHandshake (handshake) {
      if (!handshake.m || !handshake.m[this.name]) {
        return messageBus.emit(
          PaidStreamingExtensionEvents.WARNING,
          new Error("!>Peer does not support paidStreamingExtension")
        );
      }
      if (handshake.pseAccount) {
        this.peerAccount = handshake.pseAccount;
      }
      messageBus.emit(PaidStreamingExtensionEvents.PSE_HANDSHAKE, {
        pseAccount: this.peerAccount
      });
    }

    stop () {
      this.isForceChoking = true;
      wire.choke();
      executeExtensionCommand(
        this.name,
        wire,
        PaidStreamingExtensionNotices.STOP
      );
    }

    start () {
      this.isForceChoking = false;
      wire.unchoke();
      executeExtensionCommand(
        this.name,
        wire,
        PaidStreamingExtensionNotices.START,
        { pendingRequests: this.blockedRequests }
      );
    }

    ack () {
      executeExtensionCommand(
        this.name,
        wire,
        PaidStreamingExtensionNotices.ACK
      );
    }


    onMessage (buffer) {
      try {
        const jsonData = bencode.decode(buffer, undefined, undefined, 'utf8')
        messageBus.emit(PaidStreamingExtensionEvents.NOTICE, jsonData);
      } catch (err) {
        console.error("!> ERRROR on decoding", err);
        return
      }
    }
  }

  return PaidStreamingExtension;
}
