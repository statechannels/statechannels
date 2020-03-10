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
import {utils} from 'ethers';
import {ChannelState, PaymentChannelClient} from '../clients/payment-channel-client';
import {Message, ChannelResult} from '@statechannels/channel-client';

const bigNumberify = utils.bigNumberify;
const log = debug('web3torrent:library');

export type TorrentCallback = (torrent: Torrent) => any;

export * from './types';

export const WEI_PER_BYTE = bigNumberify(1); // cost per credit / piece
export const BUFFER_REFILL_RATE = bigNumberify(100000); // number of credits / pieces the leecher wishes to increase the buffer by
// These variables control the amount of (micro)trust the leecher must invest in the seeder
// As well as the overall performance hit of integrating payments into webtorrent.
// A high BUFFER_REFILL_RATE increases the need for trust, but decreases the number of additional messages and therefore latency
// It can also cause a payment to go above the leecher's balance / capabilities
export const INITIAL_SEEDER_BALANCE = bigNumberify(0); // needs to be zero so that depositing works correctly (unidirectional payment channel)
export const INITIAL_LEECHER_BALANCE = bigNumberify(1e9); // e.g. gwei = 1e9 = nano-ETH

// A Whimsical diagram explaining the functionality of Web3Torrent: https://whimsical.com/Sq6whAwa8aTjbwMRJc7vPU
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
      log('> wire keep-alive :', !torrent.done && wire.amChoking, torrent, wire);
      if (!torrent.done && wire.amChoking) {
        wire._clearTimeout();
      }
    });

    wire.on(WireEvents.REQUEST, (index: number, _: number, size: number) => {
      const reqPrice = bigNumberify(size).mul(WEI_PER_BYTE); // in buffer units
      // log('> REQ: ' + index, ' cost ' + reqPrice.toNumber());
      const peerAccount = wire.paidStreamingExtension.peerAccount as string;
      const channelId = wire.paidStreamingExtension.pseChannelId as string;

      const knownPeerAccount = this.peersList[torrent.infoHash][peerAccount];

      if (!knownPeerAccount) {
        this.peersList[torrent.infoHash][peerAccount] = {
          id: peerAccount,
          wire,
          buffer: '0', // (pieces) a value x > 0 would allow a leecher to download x bytes
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
      } else if (!knownPeerAccount.allowed || bigNumberify(knownPeerAccount.buffer).lt(reqPrice)) {
        // log('BLOCKED: ' + index, 'buffer: ' + bigNumberify(knownPeerAccount.buffer).toString());
        // As soon as buffer is empty, block
        this.blockPeer(torrent.infoHash, wire, peerAccount);
      } else {
        this.peersList[torrent.infoHash][peerAccount] = {
          id: peerAccount,
          wire,
          buffer: bigNumberify(knownPeerAccount.buffer)
            .sub(reqPrice) // decrease buffer by the price of this request
            .toString(),
          seederBalance: knownPeerAccount.seederBalance,
          allowed: true,
          channelId
        };
        // log(
        //   'PASSED: ' + index,
        //   'Buffer Updated: ' + this.peersList[torrent.infoHash][peerAccount].buffer,
        //   'Seeder Balance: ' + knownPeerAccount.seederBalance
        // );
      }
    });

    wire.paidStreamingExtension.once(
      PaidStreamingExtensionEvents.REQUEST,
      async (index: number, offset: number, size: number) => {
        const {peerAccount, peerOutcomeAddress} = wire.paidStreamingExtension;
        log(`> wire first_request of ${peerAccount} with outcomeAddress ${peerOutcomeAddress}`);

        // SEEDER is participants[0], LEECHER is participants[1]
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
        wire.emit(PaidStreamingExtensionEvents.REQUEST, index, offset, size);
      }
    );

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

    this.paymentChannelClient.onChannelUpdated(async (channelState: ChannelState) => {
      log(`State received with turnNum ${channelState.turnNum}`);
      if (
        this.paymentChannelClient.isPaymentToMe(channelState) ||
        Number(channelState.turnNum) === 3
        // returns true for the second postFS if I am the beneficiary
        // (I need to countersign this state in order for the first payment to be sent)
      ) {
        log(
          `Accepting payment, refilling buffer and unblocking ${wire.paidStreamingExtension.peerAccount}`
        );
        await this.paymentChannelClient.acceptPayment(
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
    });
  }

  protected async refillBuffer(infoHash: string, peerId: string, channelId: string) {
    log(`querying channel client for updated balance`);
    const newSeederBalance = bigNumberify(
      this.paymentChannelClient.channelCache[channelId].beneficiaryBalance
    );
    // infer payment using update balance and previously stored balance
    const payment = bigNumberify(
      this.peersList[infoHash][peerId]
        ? newSeederBalance.sub(bigNumberify(this.peersList[infoHash][peerId].seederBalance))
        : 0
    );
    // store new balance
    this.peersList[infoHash][peerId].seederBalance = newSeederBalance.toString();
    // convert payment into number of pieces
    this.peersList[infoHash][peerId].buffer = bigNumberify(this.peersList[infoHash][peerId].buffer)
      .add(payment.div(WEI_PER_BYTE)) // This must remain an integer as long as our check above uses .isZero()
      // ethers BigNumbers are always integers
      .toString();

    log(
      `newSeederBalance: ${newSeederBalance} wei; payment: ${payment} wei;, buffer for peer: ${this.peersList[infoHash][peerId].buffer} pieces`
    );
  }

  protected async transferFunds(wire: PaidStreamingWire) {
    const channelId = wire.paidStreamingExtension.peerChannelId;

    if (
      this.paymentChannelClient.channelCache[channelId] &&
      this.paymentChannelClient.channelCache[channelId].status === 'running' &&
      bigNumberify(this.paymentChannelClient.channelCache[channelId].turnNum).gt(3)
    ) {
      await this.paymentChannelClient.makePayment(
        channelId,
        WEI_PER_BYTE.mul(BUFFER_REFILL_RATE).toString()
      );
      const newSeederBalance = bigNumberify(
        this.paymentChannelClient.channelCache[channelId].beneficiaryBalance
      );
      log(`payment made for channel ${channelId}, newSeederBalance: ${newSeederBalance}`);
    }
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
          if (message.recipient === this.pseAccount) {
            channelId = message.data.channelId;
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
    log(
      `LEECHER: > JumpStarting! - With ${wire.requests.length} pending wire requests. Current Torrent Pieces: `,
      torrent.pieces
    );
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
      log('LEECHER: > Requests cleared!', canceledReservations);
      torrent._updateWire(wire);
    } else {
      log('LEECHER: > Torrent its working fine or it finished', torrent, wire);
    }
  }
}
