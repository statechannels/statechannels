import {FakeChannelProvider} from '@statechannels/channel-channelClient';
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
import {Web3TorrentChannelClient} from '../clients/web3t-channel-channelClient';
import {ChannelClient} from '@statechannels/channel-channelClient';

const log = debug('web3torrent:library');

export type WebTorrentPaidStreamingClientOptions = WebTorrent.Options &
  Partial<PaidStreamingExtensionOptions>;
export type TorrentCallback = (torrent: Torrent) => any;

export * from './types';

export const REQUEST_RATE = 10;

if (process.env.REACT_APP_FAKE_CHANNEL_PROVIDER === 'true') {
  window.channelProvider = new FakeChannelProvider();
} else {
  // TODO: Replace with injection via other means than direct app import
  // NOTE: This adds `channelProvider` to the `Window` object
  require('@statechannels/channel-provider');
}

// TODO: Put inside better place than here where app can handle error case
window.channelProvider.enable(process.env.REACT_APP_WALLET_URL);

export default class WebTorrentPaidStreamingClient extends WebTorrent {
  allowedPeers: PeersByTorrent;
  pseAccount: string;
  torrents: PaidStreamingTorrent[] = [];
  channelClient: Web3TorrentChannelClient;

  constructor(opts: WebTorrentPaidStreamingClientOptions = {}) {
    super(opts);
    this.channelClient = new Web3TorrentChannelClient(new ChannelClient(window.channelProvider));
    this.allowedPeers = {};
    this.pseAccount = opts.pseAccount || Math.floor(Math.random() * 99999999999999999).toString();
    log('ACCOUNT ID: ', this.pseAccount);
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
    this.allowedPeers[torrentInfoHash][peerAccount].allowed = false;
    wire.paidStreamingExtension.stop();
    this.emit(ClientEvents.PEER_STATUS_CHANGED, {
      torrentPeers: this.allowedPeers[torrentInfoHash],
      torrentInfoHash,
      peerAccount
    });
    log('SEEDER: > blockedPeer', peerAccount, Object.keys(this.allowedPeers));
  }

  unblockPeer(torrentInfoHash: string, wire: PaidStreamingWire, peerAccount: string) {
    this.allowedPeers[torrentInfoHash][peerAccount].allowed = true;
    wire.paidStreamingExtension.start();
    this.emit(ClientEvents.PEER_STATUS_CHANGED, {
      torrentPeers: this.allowedPeers[torrentInfoHash],
      torrentInfoHash,
      peerAccount
    });
    log('SEEDER: > unblockedPeer', peerAccount, 'from', Object.keys(this.allowedPeers));
  }

  togglePeer(torrentInfoHash, peerAccount: string) {
    const {wire, allowed} = this.allowedPeers[torrentInfoHash][peerAccount];
    if (allowed) {
      this.blockPeer(torrentInfoHash, wire as PaidStreamingWire, peerAccount);
    } else {
      this.unblockPeer(torrentInfoHash, wire as PaidStreamingWire, peerAccount);
    }
    log('SEEDER: > togglePeer', peerAccount);
  }

  protected setupWire(torrent: Torrent, wire: PaidStreamingWire) {
    log('> Wire Setup');

    wire.use(paidStreamingExtension({pseAccount: this.pseAccount}));
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
      const knownPeerAccount = this.allowedPeers[torrent.infoHash][peerAccount];

      if (!knownPeerAccount) {
        this.allowedPeers[torrent.infoHash][peerAccount] = {
          id: peerAccount,
          wire,
          funds: '0',
          allowed: false
        };
        this.blockPeer(torrent.infoHash, wire, peerAccount);
        this.emit(ClientEvents.PEER_STATUS_CHANGED, {
          torrentPeers: this.allowedPeers[torrent.infoHash],
          torrentInfoHash: torrent.infoHash,
          peerAccount
        });
      } else if (!knownPeerAccount.allowed || Number(knownPeerAccount.funds) < REQUEST_RATE) {
        this.blockPeer(torrent.infoHash, wire, peerAccount);
      } else {
        this.allowedPeers[torrent.infoHash][peerAccount] = {
          id: peerAccount,
          wire,
          funds: (Number(knownPeerAccount.funds) - 10).toString(),
          allowed: true
        };
      }
    });

    wire.paidStreamingExtension.once(PaidStreamingExtensionEvents.REQUEST, () => {
      const peerAccount = wire.paidStreamingExtension && wire.paidStreamingExtension.peerAccount;
      log(`SEEDER > wire first_request of ${peerAccount}`);
      // [ George ] Here we could call channelClient.joinChannel()
      wire.emit(PaidStreamingExtensionEvents.REQUEST, peerAccount);
    });

    wire.paidStreamingExtension.on(PaidStreamingExtensionEvents.NOTICE, notice =>
      torrent.emit(PaidStreamingExtensionEvents.NOTICE, wire, notice)
    );
  }

  protected loadFunds(infoHash: string, peerId: string, paymentHash: string) {
    // [ George ] Here the seeder can countersign the state update by an appropriate channelClient.updateChannel(), and pull the updated state channel balance off the ChannelResult before updating this.allowedPeers[infoHash][peerId].funds accordingly.

    // [ George ] If web3torrent is to run the Single Asset Payments ForceMoveApp, and the payments are going to be unidirectional we could wrap the channelClient in a web3tChannelClient which offers a countersign() convenience method. This allows the seeder to immediately accept the payment and for the leecher to be ready to send another one as quickly as possible.

    // [ George ] NB all channel channelClient methods are async so we would want to await them before continuing. That means a bunch of methods in this class will also need to be aysnc.

    const {funds} = this.allowedPeers[infoHash][peerId];
    this.allowedPeers[infoHash][peerId].funds = (Number(funds) + Number(paymentHash)).toString();
  }

  protected async transferFunds(wire: PaidStreamingWire) {
    // [ George ] I think this is where the leecher could call channelClient.updateChannel(). A first iteration might just do this without any UI or checks.

    const channel = await this.channelClient.createChannel(
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      '0x00',
      '0x00',
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000'
    );

    (window.channelProvider as FakeChannelProvider).playerIndex = 1;

    this.channelClient.onMessageQueued(({sender, recipient, data}) => {
      wire.paidStreamingExtension.payment(JSON.stringify(data));
    });

    await this.channelClient.updateChannel(
      channel.channelId, // channelId,
      '0x0000000000000000000000000000000000000000', // seeder,
      '0x0000000000000000000000000000000000000000', // leecher,
      '0x00', // seederBalance,
      '0x00', // leecherBalance,
      '0x0000000000000000000000000000000000000000', // seederOutcomeAddress,
      '0x0000000000000000000000000000000000000000' // leecherOutcomeAddress
    );
  }

  protected setupTorrent(torrent: PaidStreamingTorrent) {
    if (torrent.usingPaidStreaming) {
      return torrent;
    }
    torrent.on('infoHash', () => {
      this.allowedPeers = {...this.allowedPeers, [torrent.infoHash]: {}};
    });
    torrent.on(TorrentEvents.WIRE, (wire: PaidStreamingWire) => {
      this.setupWire(torrent, wire);
    });

    torrent.on(TorrentEvents.NOTICE, async (wire, {command, data}) => {
      log(`< ${command} received from ${wire.peerExtendedHandshake.pseAccount}`, data);
      switch (command) {
        case PaidStreamingExtensionNotices.STOP:
          wire.paidStreamingExtension.ack();
          wire.choke();
          await this.transferFunds(wire);
          break;
        case PaidStreamingExtensionNotices.START:
          // [ George ] Here we can call channelClient.createChannel()
          wire.paidStreamingExtension.ack();
          this.jumpStart(torrent, wire);
          break;
        case PaidStreamingExtensionNotices.PAYMENT:
          this.channelClient.pushMessage(JSON.parse(data.message));
          this.loadFunds(
            torrent.infoHash,
            wire.peerExtendedHandshake.pseAccount,
            JSON.parse(data.message)
          );
          this.unblockPeer(torrent.infoHash, wire, wire.peerExtendedHandshake.pseAccount);
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
