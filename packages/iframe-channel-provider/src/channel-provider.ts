import EventEmitter from 'eventemitter3';
import {Guid} from 'guid-typescript';
import {NotificationType, Notification} from '@statechannels/client-api-schema';

import {IFrameChannelProviderInterface} from './types';
import {WalletJsonRpcAPI} from './types/wallet-api';
import {logger} from './logger';
import {PostMessageService} from './postmessage-service';
import {IFrameService} from './iframe-service';
import {isJsonRpcNotification} from './types/jsonrpc';
import {OnType, OffType, EventType, SubscribeType, UnsubscribeType} from './types/events';

/**
 * Class for interacting with a statechannels wallet
 *
 * @beta
 */
export class IFrameChannelProvider implements IFrameChannelProviderInterface {
  /**
   * Has the wallet iFrame been mounted?
   */
  protected mounted = false;
  /**
   * EventEmitter instance emitting wallet notifications
   */
  protected readonly events: EventEmitter<EventType>;
  /**
   * Service handling embedding of an iframe onto the page
   *
   * @remarks
   * This iframe runs the wallet code
   */
  protected readonly iframe: IFrameService;
  /**
   * Handles messaging to and from the wallet using postMessage
   */
  protected readonly messaging: PostMessageService;
  protected readonly subscriptions: {
    [T in keyof NotificationType]: string[];
  } = {
    ChannelProposed: [],
    ChannelUpdated: [],
    ChannelClosed: [],
    BudgetUpdated: [],
    MessageQueued: [],
    UIUpdate: []
  };
  /**
   * The url of the hosted statechannels wallet
   */
  protected url = '';

  /**
   * The public part of the ephemeral key pair
   * @remarks The private part is used for signing state channel updates.
   */
  public signingAddress?: string;
  /**
   * The ethereum address where on-chain funds will be sent.
   */
  public destinationAddress?: string;
  /**
   * The ethereum address where on-chain funds will be sent.
   */
  public walletVersion?: string;

  /**
   * Create a new instance of this class
   *
   * @beta
   */
  constructor() {
    this.events = new EventEmitter<EventType>();
    this.iframe = new IFrameService();
    this.messaging = new PostMessageService();
  }

  /**
   * Is the wallet ready to receive requests?
   */
  walletReady = new Promise(resolve => {
    window.addEventListener('message', event => event.data === 'WalletReady' && resolve());
  });

  /**
   * Trigger the mounting of the <iframe/> element
   */
  async mountWalletComponent(url?: string) {
    if (this.mounted) {
      logger.warn(
        'The channel provider has already been mounted: ignoring call to mountWalletComponent'
      );
      return;
    }

    this.mounted = true;

    window.addEventListener('message', this.onMessage.bind(this));
    if (url) {
      this.url = url;
    }
    this.iframe.setUrl(this.url);
    this.messaging.setUrl(this.url);
    await this.iframe.mount();
    logger.info('Application successfully mounted Wallet iFrame inside DOM.');
    logger.info('Waiting for wallet ping...');
    await this.walletReady;
    logger.info('Wallet ready to receive requests');
    const {signingAddress, destinationAddress, walletVersion} = await this.send(
      'GetWalletInformation',
      {}
    );
    this.signingAddress = signingAddress;
    this.destinationAddress = destinationAddress;
    this.walletVersion = walletVersion;
  }

  /**
   * Enable the channel provider
   *
   * @remarks
   * This causes the provider to cache {@link IFrameChannelProvider.signingAddress | signingAddress}, {@link IFrameChannelProvider.destinationAddress | destinationAddress} and {@link IFrameChannelProvider.walletVersion | walletVersion} from the wallet.
   * @returns Promise which resolves when the wallet has completed the Enable Ethereum workflow.
   */
  async enable() {
    const {signingAddress, destinationAddress, walletVersion} = await this.send(
      'EnableEthereum',
      {}
    );
    this.signingAddress = signingAddress;
    this.destinationAddress = destinationAddress;
    this.walletVersion = walletVersion;
  }

  async send<M extends keyof WalletJsonRpcAPI>(
    method: M,
    params: WalletJsonRpcAPI[M]['request']['params']
  ): Promise<WalletJsonRpcAPI[M]['response']['result']> {
    const target = await this.iframe.getTarget();
    const response = await this.messaging.request(target, {
      jsonrpc: '2.0',
      method: method,
      params: params
    });

    return response;
  }

  subscribe: SubscribeType = async subscriptionType => {
    const subscriptionId = Guid.create().toString();
    this.subscriptions[subscriptionType].push(subscriptionId);
    return subscriptionId;
  };

  unsubscribe: UnsubscribeType = async subscriptionId => {
    Object.keys(this.subscriptions).forEach(method => {
      this.subscriptions[method as Notification['method']] = this.subscriptions[
        method as Notification['method']
      ].filter((id: string) => id != subscriptionId);
    });

    return true;
  };

  /**
   * eventemitter 'on' for JSON-RPC Notifications. Use this to register callbacks.
   */
  on: OnType = (method, params) => this.events.on(method, params);
  /**
   * eventemitter 'off' for JSON-RPC Notifications. Use this to unregister callbacks.
   */
  off: OffType = (method, params) => this.events.off(method, params);

  protected async onMessage(event: MessageEvent) {
    const message = event.data;
    if (!message.jsonrpc) {
      return;
    }

    if (isJsonRpcNotification<keyof NotificationType>(message)) {
      // TODO: use schema validations as better type guards
      const notificationMethod = message.method;
      const notificationParams = message.params;
      this.events.emit(notificationMethod, notificationParams);
      if (notificationMethod === 'UIUpdate') {
        this.iframe.setVisibility(message.params.showWallet);
      } else {
        this.subscriptions[notificationMethod].forEach(id => {
          this.events.emit(id, notificationParams);
        });
      }
    }
  }
}

/**
 * Class instance that is attached to the window object
 *
 * @remarks
 * Accessible via `window.channelProvider`
 *
 * @beta
 */
const channelProvider = new IFrameChannelProvider();

export {channelProvider};
