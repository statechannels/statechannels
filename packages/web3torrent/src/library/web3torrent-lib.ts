import debug from 'debug';
import WebTorrent, {Torrent, TorrentOptions} from 'webtorrent';
import paidStreamingExtension, {PaidStreamingExtensionOptions} from './pse-middleware';
import {
  ClientEvents,
  ExtendedTorrent,
  PaidStreamingExtensionEvents,
  PaidStreamingExtensionNotices,
  PaidStreamingTorrent,
  PaidStreamingWire,
  PeersByTorrent,
  TorrentEvents,
  WebTorrentAddInput,
  WebTorrentSeedInput,
  WireEvents
} from './types';
import {utils} from 'ethers';
import {ChannelState, PaymentChannelClient} from '../clients/payment-channel-client';
import {mockTorrents, defaultTrackers} from '../constants';
import * as firebase from 'firebase/app';
import 'firebase/database';
import {Message} from '@statechannels/client-api-schema';

const bigNumberify = utils.bigNumberify;
const log = debug('web3torrent:library');

export type TorrentCallback = (torrent: Torrent) => any;

export * from './types';

export const WEI_PER_BYTE = bigNumberify(1); // cost per byte
export const BUFFER_REFILL_RATE = bigNumberify(2e4); // number of bytes the leecher wishes to increase the buffer by
// These variables control the amount of (micro)trust the leecher must invest in the seeder
// As well as the overall performance hit of integrating payments into webtorrent.
// A high BUFFER_REFILL_RATE increases the need for trust, but decreases the number of additional messages and therefore latency
// It can also cause a payment to go above the leecher's balance / capabilities
export const INITIAL_SEEDER_BALANCE = bigNumberify(0); // needs to be zero so that depositing works correctly (unidirectional payment channel)
export const INITIAL_LEECHER_BALANCE = bigNumberify(BUFFER_REFILL_RATE.mul(100)); // e.g. gwei = 1e9 = nano-ETH

// firebase setup
const FIREBASE_PREFIX = 'web3t';
const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: `${process.env.REACT_APP_FIREBASE_PROJECT}.firebaseapp.com`,
  databaseURL: `https://${process.env.REACT_APP_FIREBASE_PROJECT}.firebaseio.com`,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT,
  storageBucket: '',
  messagingSenderId: '913007764573'
};
const HUB_ADDRESS = 'TODO';
firebase.initializeApp(config);
function sanitizeMessageForFirebase(message) {
  return JSON.parse(JSON.stringify(message));
}

// A Whimsical diagram explaining the functionality of Web3Torrent: https://whimsical.com/Sq6whAwa8aTjbwMRJc7vPU
export default class WebTorrentPaidStreamingClient extends WebTorrent {
  peersList: PeersByTorrent;
  torrents: PaidStreamingTorrent[] = [];
  paymentChannelClient: PaymentChannelClient;

  pseAccount: string;
  outcomeAddress: string;

  constructor(opts: WebTorrent.Options & Partial<PaidStreamingExtensionOptions> = {}) {
    super(opts);
    this.peersList = {};
    this.pseAccount = opts.pseAccount;
    this.paymentChannelClient = opts.paymentChannelClient;
    this.outcomeAddress = opts.outcomeAddress;
  }

  async enable() {
    log('Mounting Wallet to App...');
    await window.channelProvider.mountWalletComponent(process.env.REACT_APP_WALLET_URL);
    log('Enabling Channel Provider...');
    await window.channelProvider.enable();
    log('Enabling WebTorrentPaidStreamingClient...');
    this.pseAccount = this.paymentChannelClient.mySigningAddress;
    log('set pseAccount to sc-wallet signing address');
    this.outcomeAddress = this.paymentChannelClient.myEthereumSelectedAddress;
    log('got ethereum address');
    log('ACCOUNT ID: ', this.pseAccount);
    log('THIS address: ', this.outcomeAddress);

    // Hub messaging

    const myFirebaseRef = firebase
      .database()
      .ref(`/${FIREBASE_PREFIX}/messages/${this.pseAccount}`);
    const hubFirebaseRef = firebase.database().ref(`/${FIREBASE_PREFIX}/messages/${HUB_ADDRESS}`);
    // firebase setup
    myFirebaseRef.onDisconnect().remove();

    this.paymentChannelClient.onMessageQueued((message: Message) => {
      if (message.recipient === HUB_ADDRESS) {
        hubFirebaseRef.push(sanitizeMessageForFirebase(message));
      }
    });
    myFirebaseRef.on('child_added', snapshot => {
      const key = snapshot.key;
      const message = snapshot.val();
      myFirebaseRef.child(key).remove();
      console.log('GOT FROM FIREBASE: ' + message);
      this.paymentChannelClient.pushMessage(message);
    });
  }

  async disable() {
    log('Disabling WebTorrentPaidStreamingClient');
    this.pseAccount = null;
    this.outcomeAddress = null;
    await window.ethereum.disable();
  }

  async testTorrentingCapability(timeOut: number) {
    log('Testing torrenting capability...');
    let torrentId;
    const gotAWire = new Promise(resolve => {
      super.add(mockTorrents[0].magnetURI, (torrent: Torrent) => {
        torrentId = torrent.infoHash;
        torrent.once('wire', wire => resolve(true));
      });
    });
    const timer = new Promise(function(resolve, reject) {
      setTimeout(resolve, timeOut);
    });
    const raceResult = await Promise.race([gotAWire, timer]);
    this.remove(torrentId);
    return raceResult;
  }

  seed(
    input: WebTorrentSeedInput,
    optionsOrCallback?: TorrentOptions | TorrentCallback,
    callback?: TorrentCallback
  ): PaidStreamingTorrent {
    this.ensureEnabled();
    let torrent: PaidStreamingTorrent;

    if (typeof optionsOrCallback === 'function') {
      torrent = super.seed(
        input,
        {createdBy: this.pseAccount, announce: defaultTrackers} as TorrentOptions,
        optionsOrCallback
      ) as PaidStreamingTorrent;
    } else {
      torrent = super.seed(input, optionsOrCallback, callback) as PaidStreamingTorrent;
    }
    this.setupTorrent(torrent);

    return torrent;
  }

  add(
    input: WebTorrentAddInput,
    optionsOrCallback?: TorrentOptions | TorrentCallback,
    callback?: TorrentCallback
  ): PaidStreamingTorrent {
    this.ensureEnabled();
    let torrent: PaidStreamingTorrent;

    if (typeof optionsOrCallback === 'function') {
      torrent = super.add(input, optionsOrCallback) as PaidStreamingTorrent;
    } else {
      torrent = super.add(input, optionsOrCallback, callback) as PaidStreamingTorrent;
    }
    this.setupTorrent(torrent);

    return torrent;
  }

  blockPeer(torrentInfoHash: string, wire: PaidStreamingWire, peerAccount: string) {
    this.peersList[torrentInfoHash][peerAccount].allowed = false;
    this.emit(ClientEvents.PEER_STATUS_CHANGED, {
      torrentPeers: this.peersList[torrentInfoHash],
      torrentInfoHash,
      peerAccount
    });
    log('SEEDER: > blockedPeer', peerAccount, Object.keys(this.peersList));
  }

  unblockPeer(torrentInfoHash: string, wire: PaidStreamingWire, peerAccount: string) {
    this.peersList[torrentInfoHash][peerAccount].allowed = true;
    wire.paidStreamingExtension.start();
    this.emit(ClientEvents.PEER_STATUS_CHANGED, {
      torrentPeers: this.peersList[torrentInfoHash],
      torrentInfoHash,
      peerAccount
    });
    log('SEEDER: > unblockedPeer', peerAccount, 'from', Object.keys(this.peersList));
  }

  togglePeer(torrentInfoHash: string, peerAccount: string) {
    const {wire, allowed} = this.peersList[torrentInfoHash][peerAccount];
    if (allowed) {
      this.blockPeer(torrentInfoHash, wire as PaidStreamingWire, peerAccount);
    } else {
      this.unblockPeer(torrentInfoHash, wire as PaidStreamingWire, peerAccount);
    }
    log('SEEDER: > togglePeer', peerAccount);
  }

  protected ensureEnabled() {
    if (!(this.pseAccount && this.outcomeAddress)) {
      throw new Error('WebTorrentPaidStreamingClient is not enabled');
    }
  }

  protected setupWire(torrent: Torrent, wire: PaidStreamingWire) {
    log('> Wire Setup');

    wire.use(
      paidStreamingExtension({pseAccount: this.pseAccount, outcomeAddress: this.outcomeAddress})
    );
    wire.setKeepAlive(true);
    wire.setTimeout(65000);
    wire.on(WireEvents.KEEP_ALIVE, () => {
      log('> wire keep-alive :', !torrent.done && wire.amChoking, torrent);
      if (!torrent.done && wire.amChoking) {
        wire._clearTimeout();
      }
    });

    wire.paidStreamingExtension.on(
      PaidStreamingExtensionEvents.REQUEST,
      async (index: number, size: number, response: (allow: boolean) => void) => {
        const reqPrice = bigNumberify(size).mul(WEI_PER_BYTE);
        const {peerAccount, peerOutcomeAddress} = wire.paidStreamingExtension;
        const knownPeerAccount = this.peersList[torrent.infoHash][peerAccount];

        if (!knownPeerAccount) {
          log(`> wire first_request of ${peerAccount} with outcomeAddress ${peerOutcomeAddress}`);
          const channel = await this.paymentChannelClient.createChannel(
            this.pseAccount, // seeder
            peerAccount, // leecher
            INITIAL_SEEDER_BALANCE.toString(), // seederBalance,
            INITIAL_LEECHER_BALANCE.toString(), // leecherBalance,
            this.paymentChannelClient.myEthereumSelectedAddress, // seederOutcomeAddress,
            peerOutcomeAddress // leecherOutcomeAddress
          );
          log(`> created channel with id ${channel.channelId}`);
          wire.paidStreamingExtension.pseChannelId = channel.channelId;

          this.peersList[torrent.infoHash][peerAccount] = {
            id: peerAccount,
            wire,
            buffer: '0', // (bytes) a value x > 0 would allow a leecher to download x bytes
            beneficiaryBalance: '0', // (wei)
            allowed: false,
            channelId: channel.channelId
          };
          response(false);

          this.blockPeer(torrent.infoHash, wire, peerAccount);
        } else if (!knownPeerAccount.allowed || reqPrice.gt(knownPeerAccount.buffer)) {
          response(false);
          log('> BLOCKED: ' + index, 'BUFFER: ' + knownPeerAccount.buffer);
          this.blockPeer(torrent.infoHash, wire, peerAccount); // As soon as buffer is empty, block
          wire.paidStreamingExtension.stop(); // prompt peer for a payment
        } else {
          this.peersList[torrent.infoHash][peerAccount] = {
            id: peerAccount,
            wire,
            buffer: bigNumberify(knownPeerAccount.buffer)
              .sub(reqPrice) // decrease buffer by the price of this request
              .toString(),
            beneficiaryBalance: knownPeerAccount.beneficiaryBalance,
            allowed: true,
            channelId: knownPeerAccount.channelId
          };
          response(true);
          log(
            '> ALLOWED: ' + index,
            'BUFFER: ' + this.peersList[torrent.infoHash][peerAccount].buffer,
            'BALANCE: ' + this.peersList[torrent.infoHash][peerAccount].beneficiaryBalance
          );
        }
      }
    );

    wire.paidStreamingExtension.on(PaidStreamingExtensionEvents.NOTICE, notice =>
      torrent.emit(PaidStreamingExtensionEvents.NOTICE, wire, notice)
    );

    // If the wallet queues a message, send it across the wire
    this.paymentChannelClient.onMessageQueued((message: Message) => {
      if (message.recipient === wire.paidStreamingExtension.peerAccount) {
        wire.paidStreamingExtension.sendMessage(JSON.stringify(message));
      }
    });

    // If a channel is proposed, join it
    this.paymentChannelClient.onChannelProposed(async (channelState: ChannelState) => {
      if (!this.paymentChannelClient.amProposer(channelState)) {
        // do not pass a channelId, since this is the first we heard about this channel and it won't be cached
        // only join if counterparty proposed
        await this.paymentChannelClient.joinChannel(channelState.channelId);
        log(`Joined channel ${channelState.channelId}`);
      }
    });

    this.paymentChannelClient.onChannelUpdated(async (channelState: ChannelState) => {
      if (channelState.channelId === wire.paidStreamingExtension.pseChannelId) {
        // filter to updates for the channel on this wire
        log(`State received with turnNum ${channelState.turnNum}`);
        if (this.paymentChannelClient.shouldSendSpacerState(channelState)) {
          // send "spacer" state
          await this.paymentChannelClient.acceptChannelUpdate(
            this.paymentChannelClient.channelCache[channelState.channelId]
          );
          wire.paidStreamingExtension.stop(); // prompt peer for a payment
        } else if (this.paymentChannelClient.isPaymentToMe(channelState)) {
          log(
            `Accepting payment, refilling buffer and unblocking ${wire.paidStreamingExtension.peerAccount}`
          );
          await this.paymentChannelClient.acceptChannelUpdate(
            this.paymentChannelClient.channelCache[channelState.channelId]
          );
          await this.refillBuffer(
            torrent.infoHash,
            wire.paidStreamingExtension.peerAccount,
            channelState.channelId
          );
          this.unblockPeer(torrent.infoHash, wire, wire.paidStreamingExtension.peerAccount);
          // TODO: only unblock if the buffer is large enough
        }
      }
    });
  }

  protected refillBuffer(infoHash: string, peerId: string, channelId: string) {
    if (!this.peersList[infoHash][peerId]) {
      throw new Error(
        `Received payment from ${peerId} in channel ${channelId} but peer not known!`
      );
    }
    log(`querying channel client for updated balance`);
    const newBeneficiaryBalance = bigNumberify(
      this.paymentChannelClient.channelCache[channelId].beneficiaryBalance
    );
    // infer payment using update balance and previously stored balance
    const payment = bigNumberify(
      newBeneficiaryBalance.sub(bigNumberify(this.peersList[infoHash][peerId].beneficiaryBalance))
    );
    // store new balance

    this.peersList[infoHash][peerId].beneficiaryBalance = newBeneficiaryBalance.toString();
    // convert payment into buffer units (bytes)
    this.peersList[infoHash][peerId].buffer = bigNumberify(this.peersList[infoHash][peerId].buffer)
      .add(payment.div(WEI_PER_BYTE)) // This must remain an integer as long as our check above uses .isZero()
      // ethers BigNumbers are always integers
      .toString();

    log(
      `beneficiaryBalance: ${newBeneficiaryBalance} wei; payment: ${payment} wei;, buffer for peer: ${this.peersList[infoHash][peerId].buffer} bytes`
    );
  }

  protected setupTorrent(torrent: PaidStreamingTorrent) {
    if (torrent.usingPaidStreaming) {
      return torrent;
    }
    torrent.on('infoHash', () => {
      this.peersList = {...this.peersList, [torrent.infoHash]: {}};
    });
    torrent.on(TorrentEvents.WIRE, (wire: PaidStreamingWire) => {
      this.setupWire(torrent, wire);
    });

    torrent.on(TorrentEvents.NOTICE, async (wire, {command, data}) => {
      log(`< ${command} received from ${wire.peerExtendedHandshake.pseAccount}`, data);
      let message: Message;
      switch (command) {
        case PaidStreamingExtensionNotices.STOP: // synonymous with a prompt for a payment
          if (!torrent.done) {
            const channelId = data;
            await this.paymentChannelClient.makePayment(
              channelId,
              WEI_PER_BYTE.mul(BUFFER_REFILL_RATE).toString()
            );

            let balance: string;
            const channel = this.paymentChannelClient.channelCache[channelId];

            if (channel) {
              balance = channel.beneficiaryBalance;
            } else {
              balance = 'unknown';
            }

            log(
              `attempted to make payment for channel ${channelId}, beneficiaryBalance: ${balance}`
            );
          }
          break;
        case PaidStreamingExtensionNotices.START:
          this.jumpStart(torrent, wire);
          break;
        case PaidStreamingExtensionNotices.MESSAGE:
          message = JSON.parse(data.message);
          if (message.recipient === this.pseAccount) {
            await this.paymentChannelClient.pushMessage(message);
          }
          break;
        default:
          break;
      }
      this.emit(ClientEvents.TORRENT_NOTICE, {torrent, wire, command, data});
    });

    torrent.on(TorrentEvents.DONE, async () => {
      log('Torrent DONE!');
      this.emit(ClientEvents.TORRENT_DONE, {torrent});
      torrent.wires.forEach(
        async wire =>
          wire.paidStreamingExtension.peerChannelId &&
          (await this.paymentChannelClient.closeChannel(wire.paidStreamingExtension.peerChannelId))
      ); // close any channels that I am the leecher in (that my peer opened)
    });

    torrent.on(TorrentEvents.ERROR, err => {
      log('ERROR: > ', err);
      this.emit(ClientEvents.TORRENT_ERROR, {torrent, err});
    });
    torrent.usingPaidStreaming = true;

    return torrent;
  }

  protected jumpStart(torrent: ExtendedTorrent, wire: PaidStreamingWire) {
    if (torrent.done) {
      log('JUMPSTART: > Torrent FINISHED', torrent, wire);
      return;
    }

    log(`JUMPSTART: Wire requests.`, JSON.stringify(wire.requests, null, 1));
    torrent.pieces.forEach(piece => {
      if (piece && !!piece._reservations) {
        piece._reservations--;
      }
    });
    torrent._update();
  }
}
