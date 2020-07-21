import EventEmitter from 'eventemitter3';
import {Guid} from 'guid-typescript';
import {NotificationType, Notification} from '@statechannels/client-api-schema';

import {MessagingService} from './messaging-service';
import {
  ChannelProviderInterface,
  isJsonRpcNotification,
  MethodRequestType,
  MethodResponseType,
  OnType,
  OffType,
  EventType
} from './types';
import {UIService} from './ui-service';
import {logger} from './logger';

class ChannelProvider implements ChannelProviderInterface {
  protected mounted = false;
  protected readonly events: EventEmitter<EventType>;
  protected readonly ui: UIService;
  protected readonly messaging: MessagingService;
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
  protected url = '';

  public signingAddress?: string;
  public destinationAddress?: string;
  public walletVersion?: string;

  constructor() {
    this.events = new EventEmitter<EventType>();
    this.ui = new UIService();
    this.messaging = new MessagingService();
  }

  walletReady = new Promise(resolve => {
    window.addEventListener('message', event => event.data === 'WalletReady' && resolve());
  });

  async mountWalletComponent(url?: string) {
    if (this.mounted) {
      logger.warn(
        'The channel provider has already been mounted ignoring call to mountWalletComponent'
      );
      return;
    }

    this.mounted = true;

    window.addEventListener('message', this.onMessage.bind(this));
    if (url) {
      this.url = url;
    }
    this.ui.setUrl(this.url);
    this.messaging.setUrl(this.url);
    await this.ui.mount();
    logger.info('Application successfully mounted Wallet iFrame inside DOM.');
    logger.info('Waiting for wallet ping...');
    await this.walletReady;
    logger.info('Wallet ready to receive requests');
    const {signingAddress, destinationAddress, walletVersion} = await this.send({
      method: 'GetWalletInformation',
      params: {}
    });
    this.signingAddress = signingAddress;
    this.destinationAddress = destinationAddress;
    this.walletVersion = walletVersion;
  }

  async enable() {
    const {signingAddress, destinationAddress, walletVersion} = await this.send({
      method: 'EnableEthereum',
      params: {}
    });
    this.signingAddress = signingAddress;
    this.destinationAddress = destinationAddress;
    this.walletVersion = walletVersion;
  }

  async send(request: MethodRequestType): Promise<MethodResponseType[MethodRequestType['method']]> {
    const target = await this.ui.getTarget();
    const response = await this.messaging.request(target, {
      jsonrpc: '2.0',
      method: request.method,
      params: request.params
    });

    return response;
  }

  async subscribe(subscriptionType: Notification['method']): Promise<string> {
    const subscriptionId = Guid.create().toString();
    this.subscriptions[subscriptionType].push(subscriptionId);
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<boolean> {
    Object.keys(this.subscriptions).forEach(method => {
      this.subscriptions[method as Notification['method']] = this.subscriptions[
        method as Notification['method']
      ].filter((id: string) => id != subscriptionId);
    });

    return true;
  }

  on: OnType = (method, params) => this.events.on(method, params);

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
        this.ui.setVisibility(message.params.showWallet);
      } else {
        this.subscriptions[notificationMethod].forEach(id => {
          this.events.emit(id, notificationParams);
        });
      }
    }
  }
}

const channelProvider = new ChannelProvider();

export {channelProvider};
