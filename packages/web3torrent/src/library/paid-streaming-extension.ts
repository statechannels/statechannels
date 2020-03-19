import bencode from 'bencode';
import {Extension} from 'bittorrent-protocol';
import debug from 'debug';
import EventEmitter from 'eventemitter3';
import {
  ExtendedHandshake,
  PaidStreamingExtensionEvents,
  PaidStreamingExtensionNotices,
  PaidStreamingWire
} from './types';
const log = debug('web3torrent:extension');

export abstract class PaidStreamingExtension implements Extension {
  protected wire: PaidStreamingWire;
  protected messageBus: EventEmitter;
  protected pseId: string = '';
  protected pseOutcomeAddress: string = '';

  get name(): 'paidStreamingExtension' {
    return 'paidStreamingExtension';
  }

  peerAccount?: string;
  peerOutcomeAddress?: string;

  pseChannelId: string;
  peerChannelId: string;

  isForceChoking = false;
  isBeingChoked = false;

  constructor(wireToUse: PaidStreamingWire) {
    this.wire = wireToUse;
    this.messageBus = new EventEmitter();
    this.interceptRequests();
  }

  get pseAccount(): string {
    return this.pseId;
  }

  set pseAccount(value: string) {
    this.pseId = value;
    this.wire.extendedHandshake.pseAccount = value;
  }

  get pseAddress(): string {
    return this.pseOutcomeAddress;
  }

  set pseAddress(value: string) {
    this.pseOutcomeAddress = value;
    this.wire.extendedHandshake.outcomeAddress = value;
  }

  on(event: PaidStreamingExtensionEvents, callback: EventEmitter.ListenerFn<any[]>) {
    this.messageBus.on(event, callback);
  }

  once(event: PaidStreamingExtensionEvents, callback: EventEmitter.ListenerFn<any[]>) {
    this.messageBus.once(event, callback);
  }

  onHandshake(/* infoHash, peerId, extensions */) {}

  onExtendedHandshake(handshake: ExtendedHandshake) {
    if (!handshake.m || !handshake.m[this.name]) {
      log('WARNING: Peer does not support Web3Torrent');
      return this.messageBus.emit(
        PaidStreamingExtensionEvents.WARNING,
        new Error('!>Peer does not support Web3Torrent')
      );
    }

    if (handshake.pseAccount) {
      this.peerAccount = handshake.pseAccount.toString();
    }

    if (handshake.outcomeAddress) {
      this.peerOutcomeAddress = handshake.outcomeAddress.toString();
    }

    this.messageBus.emit(PaidStreamingExtensionEvents.PSE_HANDSHAKE, {
      pseAccount: this.peerAccount,
      peerOutcomeAddress: this.peerOutcomeAddress
    });

    return true;
  }

  stop() {
    if (!this.isForceChoking) {
      this.isForceChoking = true;
      this.executeExtensionCommand(PaidStreamingExtensionNotices.STOP, this.pseChannelId);
    }
  }

  start() {
    if (this.isForceChoking) {
      setTimeout(() => {
        this.isForceChoking = false;
        this.executeExtensionCommand(PaidStreamingExtensionNotices.START);
      }, 0);
    }
  }

  ack() {
    this.executeExtensionCommand(PaidStreamingExtensionNotices.ACK);
  }

  sendMessage(message: string) {
    this.executeExtensionCommand(PaidStreamingExtensionNotices.MESSAGE, {
      message
    });
  }

  onMessage(buffer: Buffer) {
    try {
      const jsonData = bencode.decode(buffer, undefined, undefined, 'utf8');
      this.messageHandler(jsonData);
    } catch (err) {
      log('ERROR: onMessage decoding', err);
      return;
    }
  }

  protected messageHandler({command, data}) {
    switch (command) {
      case PaidStreamingExtensionNotices.ACK:
        return;
      case PaidStreamingExtensionNotices.START:
        log(`START received from ${this.peerAccount}`);
        this.isBeingChoked = false;
        this.wire.requests = [];
        this.wire.unchoke();
        break;
      case PaidStreamingExtensionNotices.STOP:
        log(`STOP received from ${this.peerAccount}`);
        this.peerChannelId = data;
        if (this.isBeingChoked) return;
        this.isBeingChoked = true;
        break;
      default:
        log(`MESSAGE received from ${this.peerAccount}`, data);
    }
    this.ack();
    this.messageBus.emit(PaidStreamingExtensionEvents.NOTICE, {command, data});
  }

  protected executeExtensionCommand(command: PaidStreamingExtensionNotices, data = {}) {
    if (!this.peerAccount) {
      log(
        'WARNING: Peer does not support Web3Torrent - This client will block all non-web3torrent leechers.'
      );
      this.messageBus.emit(
        PaidStreamingExtensionEvents.WARNING,
        new Error('!>Peer does not support Web3Torrent')
      );
    } else {
      this.wire.extended(this.name, bencode.encode({msg_type: 0, command, data}));
    }
  }

  protected interceptRequests() {
    const {messageBus, wire} = this;

    // for debugging purposes. It logs when a piece is received
    const _onPiece = wire._onPiece;
    wire._onPiece = function(index, offset, buffer) {
      log(`_onPiece PIECE: ${index}`, arguments);
      _onPiece.apply(wire, [index, offset, buffer]);
    };

    const _onRequest = wire._onRequest;
    wire._onRequest = function(index, offset, length) {
      log(`_onRequest: ${index}`);

      messageBus.emit(PaidStreamingExtensionEvents.REQUEST, index, length, function(allow = false) {
        if (allow) {
          _onRequest.apply(wire, [index, offset, length]);
          log(`_onRequest PASS - ${index}`);
        } else {
          wire._onCancel(index, offset, length);
          log(`_onRequest CHOKED - ${index}`);
        }
      });
    };
  }
}
