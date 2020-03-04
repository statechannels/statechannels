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

import {Web3TorrentChannelClientInterface, ChannelState} from '../clients/web3t-channel-client';
import {Message} from '@statechannels/channel-client';

const log = debug('web3torrent:library');

export type TorrentCallback = (torrent: Torrent) => any;

export * from './types';

export const REQUEST_RATE = bigNumberify(10);

export default class WebTorrentPaidStreamingClient extends WebTorrent {
  peersList: PeersByTorrent;
  pseAccount: string;
  torrents: PaidStreamingTorrent[] = [];
  paymentChannelClient: Web3TorrentChannelClientInterface;
  outcomeAddress: string;

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
          funds: '0',
          seederBalance: '0',
          allowed: false,
          channelId
        };
        this.blockPeer(torrent.infoHash, wire, peerAccount);
        this.emit(ClientEvents.PEER_STATUS_CHANGED, {
          torrentPeers: this.peersList[torrent.infoHash],
          torrentInfoHash: torrent.infoHash,
          peerAccount
        });
      } else if (
        !knownPeerAccount.allowed ||
        bigNumberify(knownPeerAccount.funds).lt(REQUEST_RATE)
      ) {
        this.blockPeer(torrent.infoHash, wire, peerAccount);
      } else {
        this.peersList[torrent.infoHash][peerAccount] = {
          id: peerAccount,
          wire,
          funds: bigNumberify(knownPeerAccount.funds)
            .sub(10)
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
        bigNumberify(0).toString(), // seederBalance: should begin at zero
        bigNumberify(4000).toString(), // leecherBalance,
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

  protected async loadFunds(infoHash: string, peerId: string, channelId: string) {
    // [ George ] If web3torrent is to run the Single Asset Payments ForceMoveApp, and the payments are going to be unidirectional we could wrap the channelClient in a web3tChannelClient which offers a countersign() convenience method. This allows the seeder to immediately accept the payment and for the leecher to be ready to send another one as quickly as possible.

    log(`querying channel client for updated funds`);
    const newSeederBalance = bigNumberify(
      this.paymentChannelClient.openChannels[channelId].seederBalance
    );
    const payment = newSeederBalance.sub(
      bigNumberify(this.peersList[infoHash][peerId].seederBalance)
    );
    this.peersList[infoHash][peerId].funds = bigNumberify(this.peersList[infoHash][peerId].funds)
      .add(payment)
      .toString();
    this.peersList[infoHash][peerId].seederBalance = newSeederBalance.toString();
    log(
      `newSeederBalance: ${newSeederBalance} payment: ${payment}, funds for peer: ${this.peersList[infoHash][peerId].funds}`
    );
  }

  protected async transferFunds(wire: PaidStreamingWire) {
    const channelId = wire.paidStreamingExtension.peerChannelId;

    // (window.channelProvider as FakeChannelProvider).playerIndex = 1;

    await this.paymentChannelClient.makePayment(
      channelId,
      bigNumberify(REQUEST_RATE.mul(10)).toString()
    );
    const newSeederBalance = bigNumberify(
      this.paymentChannelClient.openChannels[channelId].seederBalance
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
      let turnNum: number;
      let channelId: string;
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
          await this.paymentChannelClient.pushMessage(JSON.parse(data.message));
          turnNum = Number(JSON.parse(data.message).data.turnNum);
          channelId = JSON.parse(data.message).data.channelId;
          if (
            JSON.parse(data.message).recipient === this.pseAccount &&
            turnNum >= 3 &&
            turnNum % 2 === 1
          ) {
            // if message sent to me (seeding), and the final PostFS or a payment
            await this.loadFunds(
              torrent.infoHash,
              wire.paidStreamingExtension.peerAccount,
              channelId
            );
            await this.paymentChannelClient.acceptPayment(
              this.paymentChannelClient.openChannels[channelId]
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
    // [ George ] Here we can call channelClient.closeChannel()

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
