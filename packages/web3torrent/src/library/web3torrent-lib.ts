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
import {
  defaultTrackers,
  fireBaseConfig,
  HUB,
  FIREBASE_PREFIX,
  WEI_PER_BYTE,
  BUFFER_REFILL_RATE,
  INITIAL_LEECHER_BALANCE,
  INITIAL_SEEDER_BALANCE,
  AUTO_FUND_LEDGER,
  BLOCK_LENGTH,
  PEER_TRUST,
  testTorrent
} from '../constants';
import * as firebase from 'firebase/app';
import 'firebase/database';
import {Message} from '@statechannels/client-api-schema';
import {hexZeroPad} from 'ethers/utils';

const bigNumberify = utils.bigNumberify;
const log = debug('web3torrent:library');

export type TorrentCallback = (torrent: Torrent) => any;

export * from './types';

firebase.initializeApp(fireBaseConfig);
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
    await this.paymentChannelClient.enable();

    this.pseAccount = this.paymentChannelClient.mySigningAddress;
    log('set pseAccount to sc-wallet signing address: ' + this.pseAccount);
    this.outcomeAddress = this.paymentChannelClient.myEthereumSelectedAddress;
    log('set outcomeAddress to sc-wallet web3 wallet address: ' + this.outcomeAddress);

    this.tracker.getAnnounceOpts = () => ({pseAccount: this.pseAccount});

    // Hub messaging
    const myFirebaseRef = firebase
      .database()
      .ref(`/${FIREBASE_PREFIX}/messages/${this.pseAccount}`);
    const hubFirebaseRef = firebase
      .database()
      .ref(`/${FIREBASE_PREFIX}/messages/${HUB.participantId}`);

    // firebase setup
    myFirebaseRef.onDisconnect().remove();

    this.paymentChannelClient.onMessageQueued((message: Message) => {
      if (message.recipient === HUB.participantId) {
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

    if (AUTO_FUND_LEDGER) {
      // TODO: This is a temporary measure while we don't have any budgeting built out.
      // We automatically call approveBudgetAndFund.
      const ten = hexZeroPad(utils.parseEther('10').toHexString(), 32);
      const success = await this.paymentChannelClient.approveBudgetAndFund(
        ten,
        ten,
        window.channelProvider.selectedAddress,
        HUB.signingAddress,
        HUB.outcomeAddress
      );
      console.log(`Budget approved: ${JSON.stringify(success)}`);
    }
  }

  async disable() {
    log('Disabling WebTorrentPaidStreamingClient');
    this.pseAccount = null;
    this.outcomeAddress = null;
  }

  async testTorrentingCapability(timeOut: number) {
    log('Testing torrenting capability...');
    let torrentId;
    const gotAWire = new Promise(resolve => {
      super.add(testTorrent.magnetURI, (torrent: Torrent) => {
        torrentId = torrent.infoHash;
        torrent.once('wire', wire => resolve(true));
      });
    });
    const timer = new Promise(function(resolve, reject) {
      setTimeout(resolve, timeOut);
    });
    const raceResult = await Promise.race([gotAWire, timer]);
    if (torrentId) {
      this.remove(torrentId);
    }
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

  async cancel(torrentInfoHash: string, callback?: (err: Error | string) => void) {
    log('> Peer cancels download. Pausing torrents');
    const torrent = this.torrents.find(t => t.infoHash === torrentInfoHash);
    if (torrent) {
      torrent.pause();
    }
  }

  blockPeer(torrentInfoHash: string, wire: PaidStreamingWire, peerAccount: string) {
    this.peersList[torrentInfoHash][peerAccount].allowed = false;
    this.emit(ClientEvents.PEER_STATUS_CHANGED, {
      torrentPeers: this.peersList[torrentInfoHash],
      torrentInfoHash,
      peerAccount
    });
    log('<< blockedPeer', peerAccount, 'from', Object.keys(this.peersList));
  }

  unblockPeer(torrentInfoHash: string, wire: PaidStreamingWire, peerAccount: string) {
    this.peersList[torrentInfoHash][peerAccount].allowed = true;
    wire.paidStreamingExtension.start();
    this.emit(ClientEvents.PEER_STATUS_CHANGED, {
      torrentPeers: this.peersList[torrentInfoHash],
      torrentInfoHash,
      peerAccount
    });
    log('<< unblockedPeer', peerAccount, 'from', Object.keys(this.peersList));
  }

  togglePeer(torrentInfoHash: string, peerAccount: string) {
    const {wire, allowed} = this.peersList[torrentInfoHash][peerAccount];
    if (allowed) {
      this.blockPeer(torrentInfoHash, wire as PaidStreamingWire, peerAccount);
    } else {
      this.unblockPeer(torrentInfoHash, wire as PaidStreamingWire, peerAccount);
    }
  }

  protected ensureEnabled() {
    if (!(this.pseAccount && this.outcomeAddress)) {
      throw new Error('WebTorrentPaidStreamingClient is not enabled');
    }
  }

  protected setupWire(torrent: Torrent, wire: PaidStreamingWire) {
    log('Wire Setup', wire);

    wire.use(
      paidStreamingExtension({pseAccount: this.pseAccount, outcomeAddress: this.outcomeAddress})
    );
    wire.setKeepAlive(true);
    wire.setTimeout(65000);
    wire.on(WireEvents.KEEP_ALIVE, () => {
      log('wire keep-alive :', !torrent.done && wire.amChoking, torrent);
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
          log(`>> wire first_request of ${peerAccount} with outcomeAddress ${peerOutcomeAddress}`);
          const {channelId} = await this.paymentChannelClient.createChannel(
            this.pseAccount, // seeder
            peerAccount, // leecher
            hexZeroPad(INITIAL_SEEDER_BALANCE.toHexString(), 32), // seederBalance,
            hexZeroPad(INITIAL_LEECHER_BALANCE.toHexString(), 32), // leecherBalance,
            this.paymentChannelClient.myEthereumSelectedAddress, // seederOutcomeAddress,
            peerOutcomeAddress // leecherOutcomeAddress
          );
          // eslint-disable-next-line require-atomic-updates
          wire.paidStreamingExtension.pseChannelId = channelId;

          this.peersList[torrent.infoHash][peerAccount] = {
            id: peerAccount,
            wire,
            buffer: '0', // (bytes) a value x > 0 would allow a leecher to download x bytes
            beneficiaryBalance: '0', // (wei)
            allowed: false,
            channelId,
            uploaded: 0
          };
          log(`${peerAccount} >> REQUEST BLOCKED (NEW PEER): ${index} ChannelID: ${channelId}`);
          response(false);
          this.blockPeer(torrent.infoHash, wire, peerAccount);
        } else if (!knownPeerAccount.allowed || reqPrice.gt(knownPeerAccount.buffer)) {
          const {uploaded} = this.peersList[torrent.infoHash][peerAccount];
          log(`${peerAccount} >> REQUEST BLOCKED: ${index} UPLOADED: ${uploaded}`);
          response(false);
          this.blockPeer(torrent.infoHash, wire, peerAccount); // As soon as buffer is empty, block
          wire.paidStreamingExtension.stop(); // prompt peer for a payment
        } else {
          this.peersList[torrent.infoHash][peerAccount] = {
            ...knownPeerAccount,
            wire,
            buffer: bigNumberify(knownPeerAccount.buffer)
              .sub(reqPrice) // decrease buffer by the price of this request
              .toString(),
            uploaded: knownPeerAccount.uploaded + size
          };

          const {buffer, uploaded} = this.peersList[torrent.infoHash][peerAccount];
          log(`${peerAccount} >> REQUEST ALLOWED: ${index} BUFFER: ${buffer} UPLOAD: ${uploaded}`);

          response(true);
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
        log(`<< Joined channel ${channelState.channelId}`);
      }
    });

    this.paymentChannelClient.onChannelUpdated(async (channelState: ChannelState) => {
      if (
        channelState.channelId === wire.paidStreamingExtension.pseChannelId ||
        channelState.channelId === wire.paidStreamingExtension.peerChannelId
      ) {
        // filter to updates for the channel on this wire
        log(`Channel updated to turnNum ${channelState.turnNum}`);
        if (this.paymentChannelClient.shouldSendSpacerState(channelState)) {
          // send "spacer" state
          await this.paymentChannelClient.acceptChannelUpdate(
            this.paymentChannelClient.channelCache[channelState.channelId]
          );
          log('sent spacer state, now sending STOP');
          wire.paidStreamingExtension.stop(); // prompt peer for a payment
        } else if (this.paymentChannelClient.isPaymentToMe(channelState)) {
          // Accepting payment, refilling buffer and unblocking
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

  /**
   * Refill the buffer for a peer in a torrent, querying the channelClient for the updated balance.
   */
  protected refillBuffer(infoHash: string, peerId: string, channelId: string) {
    if (!this.peersList[infoHash][peerId]) {
      throw new Error(
        `>> Received payment from ${peerId} in channel ${channelId} but peer not known!`
      );
    }
    // querying channel client for updated balance
    const newBalance = bigNumberify(
      this.paymentChannelClient.channelCache[channelId].beneficiaryBalance
    );
    // infer payment using update balance and previously stored balance
    const payment = bigNumberify(
      newBalance.sub(bigNumberify(this.peersList[infoHash][peerId].beneficiaryBalance))
    );
    // store new balance

    this.peersList[infoHash][peerId].beneficiaryBalance = newBalance.toString();
    // convert payment into buffer units (bytes)
    this.peersList[infoHash][peerId].buffer = bigNumberify(this.peersList[infoHash][peerId].buffer)
      .add(payment.div(WEI_PER_BYTE)) // This must remain an integer as long as our check above uses .isZero()
      // ethers BigNumbers are always integers
      .toString();

    const logBuffer = this.peersList[infoHash][peerId].buffer;
    log(`${peerId} >> Refill: Balance ${newBalance} payment: ${payment} buffer: ${logBuffer}`);
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
      switch (command) {
        case PaidStreamingExtensionNotices.STOP: // synonymous with a prompt for a payment
          if (torrent.paused) {
            // We currently treat pausing torrent as canceling downloads
            await this.closeDownloadingChannels(torrent);
          } else if (!torrent.done) {
            await this.makePayment(torrent, wire);
          }
          break;
        case PaidStreamingExtensionNotices.START:
          this.jumpStart(torrent, wire);
          break;
        case PaidStreamingExtensionNotices.MESSAGE:
          await this.paymentChannelClient.pushMessage(data);
          break;
      }
      this.emit(ClientEvents.TORRENT_NOTICE, {torrent, wire, command, data});
    });

    torrent.on(TorrentEvents.DONE, async () => {
      log('<< Torrent DONE!', torrent, this.peersList[torrent.infoHash]);
      this.emit(ClientEvents.TORRENT_DONE, {torrent});
      await this.closeDownloadingChannels(torrent);
    });

    torrent.on(TorrentEvents.ERROR, err => {
      log('Torrent ERROR: ', err, torrent);
      this.emit(ClientEvents.TORRENT_ERROR, {torrent, err});
    });
    torrent.usingPaidStreaming = true;

    return torrent;
  }

  /**
   * Define the amount to pay, and makes the payment
   */
  protected async makePayment(torrent: PaidStreamingTorrent, wire: PaidStreamingWire) {
    const {peerChannelId, peerAccount} = wire.paidStreamingExtension;
    let amountToPay = BUFFER_REFILL_RATE.sub(
      WEI_PER_BYTE.mul(BLOCK_LENGTH).mul(PEER_TRUST - wire.requests.length)
    ).toString();
    log(`<< STOP ${peerAccount} - About to pay`, torrent, amountToPay);

    // On each wire, the algorithm tries to download the uneven piece (which is always the last piece)
    if (torrent.downloaded === 0 && this.isLastPieceIsReservedToWire(torrent, peerAccount)) {
      amountToPay = BUFFER_REFILL_RATE.sub(
        WEI_PER_BYTE.mul(BLOCK_LENGTH - torrent.store.store.lastChunkLength)
      ).toString();
      log(`<< STOP ${peerAccount} - LAST PIECE`, amountToPay);
    }

    await this.paymentChannelClient.makePayment(peerChannelId, amountToPay);

    const balance =
      this.paymentChannelClient.channelCache[peerChannelId] &&
      this.paymentChannelClient.channelCache[peerChannelId].beneficiaryBalance;
    log(`<< Payment - Peer ${peerAccount} Balance: ${balance} Downloaded ${wire.downloaded}`);
  }

  private isLastPieceIsReservedToWire(torrent: PaidStreamingTorrent, peerAccount: string) {
    const lastPieceReservations: PaidStreamingWire[] =
      torrent._reservations[torrent.pieces.length - 1];
    if (!lastPieceReservations || !lastPieceReservations.length) return false;
    return lastPieceReservations.find(
      wire => wire && wire.paidStreamingExtension.peerAccount === peerAccount
    );
  }
  /**
   * Close any channels that I am downloading from (that my peer opened)
   */
  protected async closeDownloadingChannels(torrent: PaidStreamingTorrent) {
    torrent.wires.forEach(async wire => {
      if (wire.paidStreamingExtension && wire.paidStreamingExtension.peerChannelId) {
        await this.paymentChannelClient.closeChannel(wire.paidStreamingExtension.peerChannelId);
      }
    });
  }

  /**
   * Jumpstart a torrent wire download, after being stopped by a peer.
   */
  protected jumpStart(torrent: ExtendedTorrent, wire: PaidStreamingWire) {
    if (torrent.done) {
      log('<< JUMPSTART: FINISHED', torrent, wire);
      return;
    }
    log(`<< START ${wire.paidStreamingExtension.peerAccount}`, torrent.pieces, wire.requests);
    wire.unchoke();
    (torrent as any)._updateWireWrapper(wire); // TODO: fix this type, if its the solution
  }
}
