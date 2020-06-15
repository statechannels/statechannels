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
  WireEvents,
  TorrentCallback,
  ExtendedTorrentOptions
} from './types';
import {ChannelState, PaymentChannelClient, peer, Peers} from '../clients/payment-channel-client';
import {
  defaultTrackers,
  WEI_PER_BYTE,
  INITIAL_SEEDER_BALANCE,
  BLOCK_LENGTH,
  PEER_TRUST
} from '../constants';
import {Message} from '@statechannels/client-api-schema';
import {utils} from 'ethers';
import {logger} from '../logger';
import * as rxjs from 'rxjs';

import {track} from '../segment-analytics';
const hexZeroPad = utils.hexZeroPad;

const bigNumberify = utils.bigNumberify;
const log = logger.child({module: 'web3torrent-lib'});

export * from './types';

// A Whimsical diagram explaining the functionality of Web3Torrent: https://whimsical.com/Sq6whAwa8aTjbwMRJc7vPU
export default class WebTorrentPaidStreamingClient extends WebTorrent {
  peersList: PeersByTorrent;
  torrents: PaidStreamingTorrent[] = [];
  paymentChannelClient: PaymentChannelClient;
  pseAccount: string;
  outcomeAddress: string;
  channelIdToTorrentMap: Record<string, string> = {};
  stoppedTorrents: Record<string, boolean> = {};

  private canWithdrawSubject: rxjs.Subject<boolean>;
  public get canWithdrawFeed() {
    return this.canWithdrawSubject as rxjs.Observable<boolean>;
  }
  constructor(opts: WebTorrent.Options & Partial<PaidStreamingExtensionOptions> = {}) {
    super({tracker: {announce: defaultTrackers}, ...opts});
    this.peersList = {};
    this.pseAccount = opts.pseAccount;
    this.paymentChannelClient = opts.paymentChannelClient;
    this.outcomeAddress = opts.outcomeAddress;
    this.canWithdrawSubject = new rxjs.BehaviorSubject(true);
  }

  /** Enable the client capabilities to seed or leech torrents, enabling the paymentChannelClient
   * and setting key information used to seed and leech torrents  */
  async enable() {
    if (!this.pseAccount || !this.outcomeAddress) {
      await this.paymentChannelClient.enable();
      this.pseAccount = this.paymentChannelClient.mySigningAddress;
      this.outcomeAddress = this.paymentChannelClient.myDestinationAddress;
      this.tracker.getAnnounceOpts = () => ({pseAccount: this.pseAccount});

      log.debug({pseAccount: this.pseAccount}, 'PSEAccount set to sc-wallet signing address');
      log.debug(
        {outcomeAddress: this.outcomeAddress},
        'OutcomeAddress set to sc-wallet Wallet address'
      );
    }
  }

  /** Utility function. Disables the client capabilities to seed or leech torrents  */
  async disable() {
    log.warn('Disabling WebTorrentPaidStreamingClient');
    this.pseAccount = null;
    this.outcomeAddress = null;
  }

  /**
   * From a string, a file, a buffer, or an array from the previous, it creates a torrent,
   * adds it to the client to be shared and announces it to the tracker.
   */
  seed(
    input: WebTorrentSeedInput,
    optionsOrCallback?: TorrentOptions | TorrentCallback,
    callback?: TorrentCallback
  ): PaidStreamingTorrent {
    this.ensureEnabled();
    this.disableWithdrawal();
    let torrent: PaidStreamingTorrent;
    let options: ExtendedTorrentOptions = {
      createdBy: this.pseAccount,
      announce: defaultTrackers
    };

    if ((input as FileList).length && (input as FileList).length > 1) {
      options.name = 'various.zip';
    }

    if (typeof optionsOrCallback === 'function') {
      torrent = super.seed(input, options, optionsOrCallback) as PaidStreamingTorrent;
    } else {
      options = {...options, ...optionsOrCallback};
      torrent = super.seed(input, options, callback) as PaidStreamingTorrent;
    }
    this.setupTorrent(torrent);

    return torrent;
  }

  /** Using a magnet, torrent information object, creates a torrent object it adds it to the client to download. */
  add(
    input: WebTorrentAddInput,
    optionsOrCallback?: TorrentOptions | TorrentCallback,
    callback?: TorrentCallback
  ): PaidStreamingTorrent {
    this.ensureEnabled();
    this.disableWithdrawal();
    let torrent: PaidStreamingTorrent;

    if (typeof optionsOrCallback === 'function') {
      torrent = super.add(input, optionsOrCallback) as PaidStreamingTorrent;
    } else {
      torrent = super.add(input, optionsOrCallback, callback) as PaidStreamingTorrent;
    }
    this.setupTorrent(torrent);

    return torrent;
  }

  /**
   * Pauses a Torrent (stop connecting to new peers). Not being used.
   *
   * WARNING: this method has not been tested since the PoC times.
   */
  pause(infoHash: string) {
    log.debug('> Peer pauses download: Pause torrent, eventual close PaymentChannels');
    const torrent = this.torrents.find(t => t.infoHash === infoHash);
    if (torrent) {
      torrent.pause(); // the paymentChannelClosing is done at the moment of payment
      this.closeTorrentChannels(torrent, true);
      this.emitTorrentUpdated(infoHash, 'pause');
    } else {
      throw new Error('No torrent found');
    }
  }

  stopUploading(infoHash: string) {
    const torrent = this.torrents.find(t => t.infoHash === infoHash);
    this.stoppedTorrents[infoHash] = true;
    // there isn't a method on the torrent to stop seeding once you have started
    // setting _rechokeNumSlots = 0 has the same effect as setting upload: false initially
    // https://github.com/webtorrent/webtorrent/blob/master/lib/torrent.js#L82-L84
    (torrent as any)._rechokeNumSlots = 0;
    (torrent as any)._rechoke();
    torrent.wires.forEach(w => w.paidStreamingExtension.permanentStop());
  }

  /**
   * Cancels a Torrent (closes all channels, destroys the torrent from memory).
   *
   * This method removes the torrent from the client and all payments trying to download a file are forfeit.
   */
  async cancel(infoHash: string) {
    const torrent = this.torrents.find(t => t.infoHash === infoHash);
    log.debug({torrent}, '> Cancelling download');

    if (torrent) {
      // This is all super-hacky. The problem is that we've integrated payments at the wire
      // level, instead of at the torrent level. In order to close the channels we need to
      // (1) first stop downloading, and then (2) exchange the close messages. If we do 1
      // via the torrent api, then we also kill the communication, so can't do 2. So instead
      // we're reaching into the torrent internals and disabling specific parts ... :/

      // if we don't stop discovery, we'll still try to connect to new peers after we've
      // turned off torrenting, which will lead to "Error: torrent is destroyed"
      await new Promise(resolve => (torrent as any).discovery.destroy(resolve));

      // We want to stop all torrenting, but don't want to close the wires, as we need them
      // to close the channels. We therefore manually set the destroyed flag on the
      // torrent instead of calling the destroy() method.
      (torrent as any).destroyed = true;

      this.stopUploading(infoHash); // also stop uploading immediately

      await this.closeTorrentChannels(torrent, false);
      await this.waitForMySeederChannelsToClose(torrent);
    } else {
      throw new Error('No torrent found');
    }

    this.enableWithdrawal();
  }

  /**
   * Sets a local block in the wire to block new requests for data to be responded.
   * And sends a STOP event to the requesting peer (leecher).
   */
  blockPeer(torrentInfoHash: string, wire: PaidStreamingWire) {
    wire.paidStreamingExtension.stop();
    const {peerAccount, seedingChannelId} = wire.paidStreamingExtension;
    const torrentPeers = this.peersList[torrentInfoHash];

    this.emit(ClientEvents.PEER_STATUS_CHANGED, {
      torrentPeers,
      torrentInfoHash,
      peerAccount,
      seedingChannelId
    });
    log.debug({from: torrentPeers, peerAccount, seedingChannelId}, `<< blockPeer`);
  }

  /**
   * Removes a local block in the wire to block new requests for data to be responded.
   * Triggers a re-processing of the cached-blocked-requests from the blocked peer.
   * Sends a START event to the requesting peer (leecher).
   */
  unblockPeer(torrentInfoHash: string, wire: PaidStreamingWire) {
    const {peerAccount, seedingChannelId} = wire.paidStreamingExtension;
    const torrentPeers = this.peersList[torrentInfoHash];

    // TODO: only unblock if the buffer is large enough
    log.debug({from: torrentPeers, peerAccount, seedingChannelId}, '<< unblockPeer: start');
    wire.paidStreamingExtension.start();
    this.emit(ClientEvents.PEER_STATUS_CHANGED, {
      torrentPeers,
      torrentInfoHash,
      peerAccount,
      seedingChannelId
    });
    log.debug({from: torrentPeers, peerAccount, seedingChannelId}, '<< unblockPeer: finish');
  }

  /** Utility function. Checks if the client is ready to seed or leech a torrent.  */
  protected ensureEnabled() {
    if (!(this.pseAccount && this.outcomeAddress)) {
      throw new Error('WebTorrentPaidStreamingClient is not enabled');
    }
  }

  /**
   * Sets the behaviour of a wire, once created.
   * This method, together with SetupTorrent, is what defines the behaviour of each created torrent in Web3Torrent.
   */
  protected setupWire(torrent: Torrent, wire: PaidStreamingWire) {
    log.info('Wire setup initiated');
    log.debug({wire}, 'Wire setup initiated');

    wire.use(
      // sets out custom extension. See https://github.com/webtorrent/bittorrent-protocol#extension-protocol-bep-10
      paidStreamingExtension({
        pseAccount: this.pseAccount,
        outcomeAddress: this.outcomeAddress
      })
    );
    wire.setKeepAlive(true); //  enables the keep-alive ping (triggered every 60s).
    wire.setTimeout(65000); // sets the requests timeout to 65seconds
    wire.on(WireEvents.KEEP_ALIVE, () => {
      {
        const msg = 'wire keep-alive';
        log.debug({keepAlive: !torrent.done && wire.amChoking}, msg);
        log.trace({torrent, wire}, msg);
      }
      if (!torrent.done && wire.amChoking) {
        wire._clearTimeout(); // clears the timeout for the pending requests sent to the seeder.
      }

      if (wire.paidStreamingExtension.leechingChannelId) {
        if (wire.downloaded === wire.paidStreamingExtension._keepAliveIncrementalDownloaded) {
          this.closeChannel(wire, wire.paidStreamingExtension.leechingChannelId);
        } else {
          wire.paidStreamingExtension._keepAliveIncrementalDownloaded = wire.downloaded;
        }
      }

      this.emitTorrentUpdated(torrent.infoHash, WireEvents.KEEP_ALIVE);
    });

    wire.paidStreamingExtension.requestFeed.subscribe(async ({index, size, response}) => {
      const reqPrice = bigNumberify(size).mul(WEI_PER_BYTE);
      const {seedingChannelId, peerAccount: peer, isForceChoking} = wire.paidStreamingExtension;
      const knownPeer = this.peersList[torrent.infoHash][seedingChannelId];

      if (this.stoppedTorrents[torrent.infoHash]) {
        wire.paidStreamingExtension.permanentStop();
      } else if (!knownPeer || !seedingChannelId) {
        await this.createPaymentChannel(torrent, wire);
        log.debug(`${peer} >> REQUEST BLOCKED (NEW WIRE): ${index}`);
        response(false);
        this.blockPeer(torrent.infoHash, wire);
      } else if (isForceChoking || reqPrice.gt(knownPeer.buffer)) {
        log.debug(`${peer} >> REQUEST BLOCKED: ${index} UPLOADED: ${knownPeer.uploaded}`);
        response(false);
        this.blockPeer(torrent.infoHash, wire); // As soon as buffer is empty, block
      } else {
        this.peersList[torrent.infoHash][seedingChannelId] = {
          ...knownPeer,
          wire,
          buffer: bigNumberify(knownPeer.buffer)
            .sub(reqPrice) // decrease buffer by the price of this request
            .toString(),
          uploaded: knownPeer.uploaded + size
        };

        const {buffer, uploaded} = this.peersList[torrent.infoHash][seedingChannelId];
        log.debug(
          {seedingChannelId, peerAccout: peer, reqPrice, index, buffer, uploaded},
          `${peer} >> REQUEST ALLOWED: ${index} BUFFER: ${buffer} UPLOADED: ${uploaded}`
        );
        response(true);
      }
    });

    wire.paidStreamingExtension.on(PaidStreamingExtensionEvents.NOTICE, notice => {
      torrent.emit(PaidStreamingExtensionEvents.NOTICE, wire, notice);
    });

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
        this.updateChannelIdToTorrentMap(channelState.channelId, torrent.infoHash);
        await this.paymentChannelClient.joinChannel(channelState.channelId);
        log.debug(`<< Joined channel ${channelState.channelId}`);
      }
    });

    this.paymentChannelClient.onChannelUpdated(async (channelState: ChannelState) => {
      const {seedingChannelId, leechingChannelId, peerAccount} = wire.paidStreamingExtension;

      const isSeedingChannel = channelState.channelId === seedingChannelId;
      const isLeechingChannel = channelState.channelId === leechingChannelId;

      if (isSeedingChannel || isLeechingChannel) {
        this.updateChannelIdToTorrentMap(channelState.channelId, torrent.infoHash);
        const isClosed = channelState.status === 'closed';
        if (isClosed) {
          if (isLeechingChannel) {
            wire.paidStreamingExtension.leechingChannelId = null;
            log.info(`Leechning channel ${channelState.channelId} set to null`);
          } else {
            wire.paidStreamingExtension.seedingChannelId = null;
            log.info(`Seeding channel ${channelState.channelId} set to null`);
          }
          log.info(`Account ${peerAccount} - ChannelId ${channelState.channelId} Channel Closed`);
        }
        // filter to updates for the channel on this wire
        log.debug(
          {channelState},
          `Channel ${channelState.channelId} updated to turnNum ${channelState.turnNum}`
        );
        if (this.paymentChannelClient.shouldSendSpacerState(channelState)) {
          // send "spacer" state
          await this.paymentChannelClient.acceptChannelUpdate(channelState);
          log.debug('sent spacer state, now sending STOP');
          this.blockPeer(torrent.infoHash, wire);
        } else if (this.paymentChannelClient.isPaymentToMe(channelState)) {
          // Accepting payment, refilling buffer and unblocking
          await this.paymentChannelClient.acceptChannelUpdate(channelState);
          this.refillBuffer(torrent.infoHash, channelState.channelId);
          this.unblockPeer(torrent.infoHash, wire);
        }
        this.emitTorrentUpdated(torrent.infoHash, 'onChannelUpdated');
      }
    });

    const msg = 'Wire Setup completed';
    log.info(msg);
    log.debug({wire}, msg);
  }

  /** Creates a payment channel, and sets the channelId property, sent to the leecher on the STOP events to leeching peers  */
  protected async createPaymentChannel(torrent: WebTorrent.Torrent, wire: PaidStreamingWire) {
    const {peerAccount, peerOutcomeAddress} = wire.paidStreamingExtension;

    const seeder = peer(
      this.pseAccount,
      this.paymentChannelClient.myDestinationAddress,
      hexZeroPad(INITIAL_SEEDER_BALANCE.toHexString(), 32)
    );
    const leecher = peer(
      peerAccount,
      peerOutcomeAddress,
      hexZeroPad(WEI_PER_BYTE.mul(torrent.length).toHexString(), 32)
    );
    const peers: Peers = {beneficiary: seeder, payer: leecher};
    const {channelId} = await this.paymentChannelClient.createChannel(peers);
    this.updateChannelIdToTorrentMap(channelId, torrent.infoHash);

    wire.paidStreamingExtension.seedingChannelId = channelId;
    this.peersList[torrent.infoHash][channelId] = {
      id: peerAccount,
      wire,
      buffer: '0', // (bytes) a value x > 0 would allow a leecher to download x bytes
      beneficiaryBalance: '0', // (wei)
      uploaded: 0
    };

    log.info(`${peerAccount} >> Channel Created - ID: ${channelId}`);
    return channelId;
  }

  /** Refill the buffer for a peer in a torrent, querying the channelClient for the updated balance.  */
  protected refillBuffer(infoHash: string, channelId: string) {
    const peer = this.peersList[infoHash][channelId];
    if (!peer) {
      throw new Error(`>> Received payment in channel ${channelId} but peer not known!`);
    }
    // querying channel client for updated balance
    const newBalance = bigNumberify(
      this.paymentChannelClient.channelCache[channelId].beneficiary.balance
    );
    // infer payment using update balance and previously stored balance
    const payment = bigNumberify(newBalance.sub(bigNumberify(peer.beneficiaryBalance)));
    // store new balance

    peer.beneficiaryBalance = newBalance.toString();
    // convert payment into buffer units (bytes)
    peer.buffer = bigNumberify(peer.buffer)
      .add(payment.div(WEI_PER_BYTE)) // This must remain an integer as long as our check above uses .isZero()
      // ethers BigNumbers are always integers
      .toString();

    log.info(
      `${channelId} >> Refill: Balance ${newBalance} payment: ${payment} buffer: ${peer.buffer}`
    );
  }

  /**
   * Sets the behaviour of a torrent, once created.
   * This is, together with SetupWire, is what defines the behaviour of each created torrent in Web3Torrent.
   */
  protected setupTorrent(torrent: PaidStreamingTorrent) {
    if (torrent.usingPaidStreaming) {
      return torrent;
    }
    torrent.on(TorrentEvents.INFOHASH, () => {
      this.peersList = {...this.peersList, [torrent.infoHash]: {}};
      this.emitTorrentUpdated(torrent.infoHash, TorrentEvents.INFOHASH);
    });

    torrent.on(TorrentEvents.WIRE, (wire: PaidStreamingWire) => {
      this.setupWire(torrent, wire);
      this.emitTorrentUpdated(torrent.infoHash, TorrentEvents.WIRE);
    });

    torrent.on(TorrentEvents.NOTICE, async (wire, {command, data}) => {
      switch (command) {
        case PaidStreamingExtensionNotices.STOP: // payment and "stop asking for data" request
          await this.makePayment(torrent, wire);
          break;
        case PaidStreamingExtensionNotices.START: // "okay, now you can continue asking for data" request
          this.jumpStart(torrent, wire);
          break;
        case PaidStreamingExtensionNotices.PERMANENT_STOP: // "no more data ever"
          if (wire.paidStreamingExtension.leechingChannelId) {
            await this.closeChannel(wire, wire.paidStreamingExtension.leechingChannelId);
          }
          break;
        case PaidStreamingExtensionNotices.MESSAGE: // general use message
          log.info({data}, 'Message received');
          await this.paymentChannelClient.pushMessage(data);
          break;
      }
      this.emit(ClientEvents.TORRENT_NOTICE, {torrent, wire, command, data});
    });

    torrent.on(TorrentEvents.DONE, async () => {
      log.debug({channels: this.paymentChannelClient.channelCache}, 'TorrentEvents: Done');
      torrent.wires.map(wire => {
        const {leechingChannelId: channelId} = wire.paidStreamingExtension;
        const channelOfWire = this.paymentChannelClient.channelCache[channelId];
        if (channelOfWire) {
          const balance = channelOfWire.beneficiary.balance;
          const downloaded = wire.downloaded;
          log.info(
            `TorrentEvents: Done, per-wire info. Channel: ${channelId} Balance: ${balance} Downloaded: ${downloaded}`
          );
        }
      });
      log.trace({torrent, peers: this.peersList[torrent.infoHash]});

      this.emit(ClientEvents.TORRENT_DONE, {torrent});
      await this.closeTorrentChannels(torrent);
      track('Torrent Done', {
        infoHash: torrent.infoHash,
        magnetURI: torrent.magnetURI,
        filename: torrent.name,
        filesize: torrent.length
      });
      this.emitTorrentUpdated(torrent.infoHash, TorrentEvents.DONE);
    });

    torrent.on(TorrentEvents.ERROR, err => {
      log.error({err, torrent}, 'Torrent ERROR');
      this.emit(ClientEvents.TORRENT_ERROR, {torrent, err});
      this.emitTorrentUpdated(torrent.infoHash, TorrentEvents.ERROR);
    });

    const emitTorrentUpdated = (trigger: string) => () =>
      this.emitTorrentUpdated(torrent.infoHash, trigger);
    torrent.on(TorrentEvents.NOPEERS, emitTorrentUpdated(TorrentEvents.NOPEERS));
    torrent.on(TorrentEvents.METADATA, emitTorrentUpdated(TorrentEvents.METADATA));
    torrent.on(TorrentEvents.READY, emitTorrentUpdated(TorrentEvents.READY));
    torrent.on(TorrentEvents.WARNING, emitTorrentUpdated(TorrentEvents.WARNING));
    // These events are too frequent
    // torrent.on(TorrentEvents.DOWNLOAD, emitTorrentUpdated(TorrentEvents.DOWNLOAD));
    // torrent.on(TorrentEvents.UPLOAD, emitTorrentUpdated(TorrentEvents.UPLOAD));

    torrent.usingPaidStreaming = true;
    return torrent;
  }

  /**
   * Resumes the download of a paused torrent.
   * Warning: not being used, not tested, previous testing showed that torrents could take a long time to resume.
   */
  protected resumeTorrent(infoHash: string) {
    const torrent = super.get(infoHash);
    if (torrent && torrent.paused) {
      torrent.resume();
    } else {
      throw new Error('Invalid infoHash of torrent to resume: ' + infoHash);
    }
  }

  /** Defines the amount to pay, and makes the payment */
  protected async makePayment(torrent: PaidStreamingTorrent, wire: PaidStreamingWire) {
    if (torrent.paused || torrent.done || torrent.destroyed) {
      const status = torrent.paused ? 'PAUSED' : 'DONE/DESTROYED';
      log.debug({torrent}, `Torrent ${status} - makePayment early exit`);
      return;
    }

    log.debug(`About to make Payment`);
    const {requests, downloaded, paidStreamingExtension} = wire;
    const {leechingChannelId, peerAccount} = paidStreamingExtension;
    this.updateChannelIdToTorrentMap(leechingChannelId, torrent.infoHash);

    let numBlocksToPayFor = requests.length > PEER_TRUST ? PEER_TRUST : requests.length;
    let tailBytes = 0;

    // On each wire, the algorithm tries to download the uneven piece (which is always the last piece)
    if (this.needsToPayTheLastPiece(torrent, peerAccount)) {
      numBlocksToPayFor = numBlocksToPayFor - 1;
      tailBytes = torrent.store.store.lastChunkLength;
    }

    const amountToPay = WEI_PER_BYTE.mul(BLOCK_LENGTH * numBlocksToPayFor + tailBytes);
    log.debug(`<< STOP ${peerAccount} - About to pay ${amountToPay.toString()}`);
    await this.paymentChannelClient.makePayment(leechingChannelId, amountToPay.toString());

    const balance = this.paymentChannelClient.channelCache[leechingChannelId].beneficiary.balance;
    log.debug(`<< Payment - Peer ${peerAccount} Balance: ${balance} Downloaded ${downloaded}`);
  }

  /** Utility function. Checks if the wire for a torrent is requesting the last piece */
  private needsToPayTheLastPiece(torrent: PaidStreamingTorrent, peerAccount: string) {
    const lastPieceReservations: PaidStreamingWire[] =
      torrent._reservations && torrent._reservations[torrent.pieces.length - 1];
    // the reservations is an array that registers the pieces that have been requested of the torrent.
    if (!lastPieceReservations || !lastPieceReservations.length) return false;

    const lastPieceIsReservedToThisWire = lastPieceReservations.some(
      wire => wire && wire.paidStreamingExtension.peerAccount === peerAccount
    );
    return lastPieceIsReservedToThisWire;
  }

  /**
   * Close any channels that I am downloading from or seeding to
   * @param torrent torrent to close channels from
   * @param includeSeedChannels optional. Used to also include seeding channels
   * (meaning payments channels where the peer is getting payed)
   */
  protected async closeTorrentChannels(torrent: PaidStreamingTorrent, includeSeedChannels = false) {
    const channelsToClose: {wire: PaidStreamingWire; channelId: string}[] = [];
    torrent.wires.forEach(wire => {
      const {seedingChannelId, leechingChannelId} = wire.paidStreamingExtension;
      if (leechingChannelId) {
        channelsToClose.push({wire, channelId: leechingChannelId});
      }
      if (includeSeedChannels && seedingChannelId) {
        channelsToClose.push({wire, channelId: seedingChannelId});
      }
    });
    // essentially creates a list of ids to close, and wires to update.
    log.trace({ids: channelsToClose.map(({channelId}) => channelId)}, 'About to close channels');
    return await Promise.all(
      channelsToClose.map(({wire, channelId}) => this.closeChannel(wire, channelId))
    );
  }

  protected async waitForMySeederChannelsToClose(torrent: PaidStreamingTorrent) {
    const channelsToWaitFor: {wire: PaidStreamingWire; channelId: string}[] = [];
    torrent.wires.forEach(wire => {
      const {seedingChannelId} = wire.paidStreamingExtension;
      if (seedingChannelId) {
        channelsToWaitFor.push({wire, channelId: seedingChannelId});
      }
    });
    // essentially creates a list of ids to close, and wires to update.
    log.trace(
      {ids: channelsToWaitFor.map(({channelId}) => channelId)},
      'Waiting for channels to close'
    );
    return await Promise.all(
      channelsToWaitFor.map(({channelId}) => this.paymentChannelClient.blockUntilClosed(channelId))
    );
  }

  /** Close a channel and remove the corresponding channelId from the wire. */
  private async closeChannel(wire: PaidStreamingWire, channelId: string): Promise<string> {
    try {
      await this.paymentChannelClient.closeChannel(channelId);
      // Note: it is possible that onChannelUpdated already set the wire.paidStreamingExtention leeching or seeding id to null
      // while we were awaiting the above promise
      if (channelId === wire.paidStreamingExtension.leechingChannelId) {
        wire.paidStreamingExtension.leechingChannelId = null;
        log.info(`Leechning channel ${channelId} set to null`);
      }
      if (channelId === wire.paidStreamingExtension.seedingChannelId) {
        wire.paidStreamingExtension.seedingChannelId = null;
        log.info(`Seeding channel ${channelId} set to null`);
      }
    } catch (error) {
      log.error({error}, 'Error closing channel');
    }
    return channelId;
  }

  /** Jumpstart a torrent wire download, after being stopped by a peer. */
  protected jumpStart(torrent: ExtendedTorrent, wire: PaidStreamingWire) {
    if (torrent.done) {
      log.warn({torrent, wire}, '<< JUMPSTART: Torrent is done');
      return;
    }
    const msg = `<< START ${wire.paidStreamingExtension.peerAccount}`;
    log.info({wire}, msg);
    log.trace({torrent, requests: wire.requests}, msg);
    torrent._updateWireWrapper(wire); // schedules a wire update (which checks it's wires and tries to make new requests and replace dead ones)
    // this is an internal function implemented here: https://github.com/webtorrent/webtorrent/blob/7ff77c3e95b2dddfa70dd49cf924073383dd565a/lib/torrent.js#L1182
    // As we changed the way peers comunicated (and it has indeed changed since the PoC days)
    // this has suffered a lot of changes, and it might not be the best solution for every case (for example, I don't know if it works for long torrent pauses).
  }

  /** Emit an event that triggers a UI re-render */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private emitTorrentUpdated(infoHash, trigger: string) {
    // log.trace(`emitTorrentUpdate: ${trigger}`);
    this.emit(WebTorrentPaidStreamingClient.torrentUpdatedEventName(infoHash));
  }

  private updateChannelIdToTorrentMap(channelId: string, torrentHash: string) {
    this.channelIdToTorrentMap = {
      ...this.channelIdToTorrentMap,
      [channelId]: torrentHash
    };
  }

  private enableWithdrawal() {
    this.canWithdrawSubject.next(true);
  }

  private disableWithdrawal() {
    this.canWithdrawSubject.next(false);
  }

  /** Util Method. Normalizes an event name. */
  public static torrentUpdatedEventName(infoHash) {
    return `torrentUpdated-${infoHash}`;
  }
}
