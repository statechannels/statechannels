import debug from 'debug';
import WebTorrent, {Torrent, TorrentOptions} from 'webtorrent';
import paidStreamingExtension, {PaidStreamingExtensionOptions} from './pse-middleware';
import {
  ClientEvents,
  ExtendedTorrent,
  ExtendedTorrentPiece,
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
import {bigNumberify} from 'ethers/utils';

import {ChannelState, PaymentChannelClient} from '../clients/payment-channel-client';
import {Message, ChannelResult} from '@statechannels/channel-client';

const log = debug('web3torrent:library');

export type TorrentCallback = (torrent: Torrent) => any;

export * from './types';

export const WEI_PER_PIECE = bigNumberify(1); // cost per credit / piece
export const BUFFER_REFILL_RATE = bigNumberify(100); // number of credits / pieces the leecher wishes to increase the buffer by
// These variables control the amount of (micro)trust the leecher must invest in the seeder
// As well as the overall performance hit of integrating payments into webtorrent.
// A high BUFFER_REFILL_RATE increases the need for trust, but decreases the number of additional messages and therefore latency
// It can also cause a payment to go above the leecher's balance / capabilities
export const INITIAL_SEEDER_BALANCE = bigNumberify(0); // needs to be zero so that depositing works correctly (unidirectional payment channel)
export const INITIAL_LEECHER_BALANCE = bigNumberify(1e9); // e.g. gwei = 1e9 = nano-ETH

export default class WebTorrentPaidStreamingClient extends WebTorrent {
  peersList: PeersByTorrent;
  pseAccount: string;
  torrents: PaidStreamingTorrent[] = [];
  outcomeAddress: string;
  paymentChannelClient: PaymentChannelClient;

  constructor(opts: WebTorrent.Options & Partial<PaidStreamingExtensionOptions> = {}) {
    super(opts);
    this.peersList = {};
    this.pseAccount = opts.pseAccount;
    this.paymentChannelClient = opts.paymentChannelClient;
    this.outcomeAddress = opts.outcomeAddress;
  }

  async enable() {
    this.pseAccount = await this.paymentChannelClient.getAddress();
    log('set pseAccount to sc-wallet signing address');
    await window.ethereum.enable(); // TODO move this inside fake provider
    this.outcomeAddress = await this.paymentChannelClient.getEthereumSelectedAddress();
    log('got ethereum address');
    log('ACCOUNT ID: ', this.pseAccount);
    log('THIS address: ', this.outcomeAddress);
  }

  seed(
    input: WebTorrentSeedInput,
    optionsOrCallback?: TorrentOptions | TorrentCallback,
    callback?: TorrentCallback
  ): PaidStreamingTorrent {
    let torrent: PaidStreamingTorrent;

    if (typeof optionsOrCallback === 'function') {
      torrent = super.seed(
        input,
        {createdBy: this.pseAccount} as TorrentOptions,
        optionsOrCallback
      ) as PaidStreamingTorrent;
    } else {
      torrent = super.seed(input, optionsOrCallback, callback) as PaidStreamingTorrent;
    }
    this.setupTorrent(torrent);
    log('torrent seed created');
    return torrent;
  }

  add(
    input: WebTorrentAddInput,
    optionsOrCallback?: TorrentOptions | TorrentCallback,
    callback?: TorrentCallback
  ): PaidStreamingTorrent {
    let torrent: PaidStreamingTorrent;

    if (typeof optionsOrCallback === 'function') {
      torrent = super.add(input, optionsOrCallback) as PaidStreamingTorrent;
    } else {
      torrent = super.add(input, optionsOrCallback, callback) as PaidStreamingTorrent;
    }

    this.setupTorrent(torrent);
    log('torrent added');
    return torrent;
  }

  blockPeer(torrentInfoHash: string, wire: PaidStreamingWire, peerAccount: string) {
    this.peersList[torrentInfoHash][peerAccount].allowed = false;
    wire.paidStreamingExtension.stop();
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

  togglePeer(torrentInfoHash, peerAccount: string) {
    const {wire, allowed} = this.peersList[torrentInfoHash][peerAccount];
    if (allowed) {
      this.blockPeer(torrentInfoHash, wire as PaidStreamingWire, peerAccount);
    } else {
      this.unblockPeer(torrentInfoHash, wire as PaidStreamingWire, peerAccount);
    }
    log('SEEDER: > togglePeer', peerAccount);
  }

  protected setupWire(torrent: Torrent, wire: PaidStreamingWire) {
    log('> Wire Setup');

    wire.use(
      paidStreamingExtension({pseAccount: this.pseAccount, outcomeAddress: this.outcomeAddress})
    );
    wire.setKeepAlive(true);
    wire.setTimeout(65000);
    wire.on('keep-alive', () => {
      log('> wire keep-alive :', !torrent.done && wire.amChoking ? 'Clearing Timeout' : '');
      if (!torrent.done && wire.amChoking) {
        wire._clearTimeout();
      }
    });

    wire.on(WireEvents.REQUEST, () => {
      const peerAccount = wire.paidStreamingExtension.peerAccount as string;
      const channelId = wire.paidStreamingExtension.pseChannelId as string;

      const knownPeerAccount = this.peersList[torrent.infoHash][peerAccount];

      if (!knownPeerAccount) {
        this.peersList[torrent.infoHash][peerAccount] = {
          id: peerAccount,
          wire,
          buffer: '0', // (pieces) a value x > 0 would allow a leecher to download x pieces for free
          seederBalance: '0', // (wei) must begin at zero so that depositing works
          allowed: false,
          channelId
        };
        this.blockPeer(torrent.infoHash, wire, peerAccount);
        this.emit(ClientEvents.PEER_STATUS_CHANGED, {
          torrentPeers: this.peersList[torrent.infoHash],
          torrentInfoHash: torrent.infoHash,
          peerAccount
        });
      } else if (!knownPeerAccount.allowed || bigNumberify(knownPeerAccount.buffer).isZero()) {
        // As soon as buffer is empty, block
        this.blockPeer(torrent.infoHash, wire, peerAccount);
      } else {
        this.peersList[torrent.infoHash][peerAccount] = {
          id: peerAccount,
          wire,
          buffer: bigNumberify(knownPeerAccount.buffer)
            .sub(1) // decrease buffer by one unit (one piece)
            .toString(),
          seederBalance: knownPeerAccount.seederBalance,
          allowed: true,
          channelId
        };
      }
    });

    wire.paidStreamingExtension.once(PaidStreamingExtensionEvents.REQUEST, async () => {
      const {peerAccount, peerOutcomeAddress} = wire.paidStreamingExtension;
      log(
        `SEEDER > wire first_request of ${peerAccount} with outcomeAddress ${peerOutcomeAddress}`
      );

      // SEEDER is participants[0], LEECHER is participants[1]
      const channel = await this.paymentChannelClient.createChannel(
        this.pseAccount, // seeder
        peerAccount, // leecher
        INITIAL_SEEDER_BALANCE.toString(), // seederBalance,
        INITIAL_LEECHER_BALANCE.toString(), // leecherBalance,
        this.paymentChannelClient.myEthereumSelectedAddress, // seederOutcomeAddress,
        peerOutcomeAddress // leecherOutcomeAddress
      );
      log(`SEEDER > created channel with id ${channel.channelId}`);
      wire.paidStreamingExtension.pseChannelId = channel.channelId;
      wire.emit(PaidStreamingExtensionEvents.REQUEST);
    });

    wire.paidStreamingExtension.on(PaidStreamingExtensionEvents.NOTICE, notice =>
      torrent.emit(PaidStreamingExtensionEvents.NOTICE, wire, notice)
    );

    // If the wallet queues a message, send it across the wire
    this.paymentChannelClient.onMessageQueued((message: Message) => {
      wire.paidStreamingExtension.sendMessage(JSON.stringify(message));
    });

    // If a channel is proposed, join it
    this.paymentChannelClient.onChannelProposed(async (channelState: ChannelState) => {
      await this.paymentChannelClient.joinChannel(channelState.channelId);
    });
  }

  protected async refillBuffer(infoHash: string, peerId: string, channelId: string) {
    log(`querying channel client for updated balance`);
    const newSeederBalance = bigNumberify(
      this.paymentChannelClient.channelCache[channelId].beneficiaryBalance
    );
    // infer payment using update balance and previously stored balance
    const payment = newSeederBalance.sub(
      bigNumberify(this.peersList[infoHash][peerId].seederBalance)
    );
    // store new balance
    this.peersList[infoHash][peerId].seederBalance = newSeederBalance.toString();
    // convert payment into number of pieces
    this.peersList[infoHash][peerId].buffer = bigNumberify(this.peersList[infoHash][peerId].buffer)
      .add(payment.div(WEI_PER_PIECE)) // TODO allow this to vary by piece size
      .toString();

    log(
      `newSeederBalance: ${newSeederBalance} wei; payment: ${payment} wei;, buffer for peer: ${this.peersList[infoHash][peerId].buffer} pieces`
    );
  }

  protected async transferFunds(wire: PaidStreamingWire) {
    const channelId = wire.paidStreamingExtension.peerChannelId;

    await this.paymentChannelClient.makePayment(
      channelId,
      WEI_PER_PIECE.mul(BUFFER_REFILL_RATE).toString()
    );
    const newSeederBalance = bigNumberify(
      this.paymentChannelClient.channelCache[channelId].beneficiaryBalance
    );
    log(`payment made for channel ${channelId}, newSeederBalance: ${newSeederBalance}`);
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
      log(
        `< ${command} received from ${wire.peerExtendedHandshake.pseAccount} with outcomeAddress ${wire.peerExtendedHandshake.outcomeAddress}`,
        data
      );
      let channelId: string;
      let message: Message<ChannelResult>;
      let channelState: ChannelState;
      switch (command) {
        case PaidStreamingExtensionNotices.STOP:
          wire.paidStreamingExtension.ack();
          wire.choke();
          if (!torrent.done) {
            wire.paidStreamingExtension.peerChannelId = data as string;
            await this.transferFunds(wire);
          }
          break;
        case PaidStreamingExtensionNotices.START:
          wire.paidStreamingExtension.ack();
          this.jumpStart(torrent, wire);
          break;
        case PaidStreamingExtensionNotices.MESSAGE:
          message = JSON.parse(data.message);
          await this.paymentChannelClient.pushMessage(message);
          channelId = message.data.channelId;
          channelState = this.paymentChannelClient.channelCache[channelId];
          // getting this from channelCache is safer than trusting message, since the wallet has validated it
          if (
            message.recipient === this.pseAccount &&
            this.paymentChannelClient.amProposer(channelId) &&
            this.paymentChannelClient.isPaymentToMe(channelState)
          ) {
            await this.refillBuffer(
              torrent.infoHash,
              wire.paidStreamingExtension.peerAccount,
              channelId
            );
            await this.paymentChannelClient.acceptPayment(
              this.paymentChannelClient.channelCache[channelId]
            );
            this.unblockPeer(torrent.infoHash, wire, wire.paidStreamingExtension.peerAccount);
          }
          break;
        default:
          break;
      }
      this.emit(ClientEvents.TORRENT_NOTICE, {torrent, wire, command, data});
    });

    torrent.on(TorrentEvents.DONE, () => this.emit(ClientEvents.TORRENT_DONE, {torrent}));
    // [ George ] Here we can call paymentChannelClient.closeChannel()

    torrent.on(TorrentEvents.ERROR, err => {
      log('ERROR: > ', err);
      this.emit(ClientEvents.TORRENT_ERROR, {torrent, err});
    });
    torrent.usingPaidStreaming = true;

    return torrent;
  }

  protected jumpStart(torrent: ExtendedTorrent, wire: PaidStreamingWire) {
    log(`LEECHER: > JumpStarting! - With ${wire.requests.length} pending wire requests`);
    wire.unchoke();
    torrent._startDiscovery();
    torrent.resume();
    if (!torrent.done) {
      wire.requests = [];
      const canceledReservations: ExtendedTorrentPiece[] = [];
      torrent.pieces = torrent.pieces.map(piece => {
        if (piece && !!piece._reservations) {
          piece._reservations = 0;
          canceledReservations.push(piece);
        }
        return piece;
      });
      log('LEECHER: > Requests cleared!');
      torrent._updateWire(wire);
    } else {
      log('LEECHER: > Torrent its working fine or it finished', torrent, wire);
    }
  }
}
