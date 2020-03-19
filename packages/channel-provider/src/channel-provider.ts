import EventEmitter from 'eventemitter3';
import {MessagingService} from './messaging-service';
import {
  ChannelProviderInterface,
  isJsonRpcNotification,
  MethodRequestType,
  MethodResponseType,
  OnType,
  OffType
} from './types';
import {UIService} from './ui-service';
import {NotificationType} from '@statechannels/client-api-schema';

class ChannelProvider implements ChannelProviderInterface {
  protected readonly events: EventEmitter<NotificationType>;
  protected readonly ui: UIService;
  protected readonly messaging: MessagingService;
  // protected readonly subscriptions: {[T in keyof NotificationType]: string[]};
  protected url = '';

  constructor() {
    this.events = new EventEmitter<NotificationType>();
    this.ui = new UIService();
    this.messaging = new MessagingService();
    // this.subscriptions = {
    //   ChannelProposed: [],
    //   ChannelUpdated: [],
    //   ChannelClosed: [],
    //   BudgetUpdated: [],
    //   MessageQueued: []
    // };
  }

  async enable(url?: string) {
    window.addEventListener('message', this.onMessage.bind(this));
    if (url) {
      this.url = url;
    }
    this.ui.setUrl(this.url);
    this.messaging.setUrl(this.url);
    await this.ui.mount();
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

  // async subscribe(subscriptionType: string): Promise<string> {
  //   const subscriptionId = Guid.create().toString();
  //   if (!this.subscriptions[subscriptionType]) {
  //     this.subscriptions[subscriptionType] = [];
  //   }
  //   this.subscriptions[subscriptionType].push(subscriptionId);
  //   return subscriptionId;
  // }

  // async unsubscribe(subscriptionId: string): Promise<boolean> {
  //   Object.keys(this.subscriptions).map(e => {
  //     this.subscriptions[e] = this.subscriptions[e]
  //       ? this.subscriptions[e].filter(s => s !== subscriptionId)
  //       : [];
  //   });
  //   return true;
  // }

  on: OnType = (method, params) => this.events.on(method, params);

  off: OffType = (method, params) => this.events.off(method, params);

  protected async onMessage(event: MessageEvent) {
    const message = event.data;
    if (!message.jsonrpc) {
      return;
    }

    if (isJsonRpcNotification<keyof NotificationType>(message)) {
      // this line asserts the type. Not currently safe
      const notificationMethod = message.method;
      const notificationParams = message.params;
      // if (eventName === 'UIUpdate') {
      //   this.ui.setVisibility(message.params.showWallet);
      // }
      this.events.emit(notificationMethod, notificationParams);
      // if (this.subscriptions[notificationMethod]) {
      //   this.subscriptions[notificationMethod].forEach(s => {
      //     this.events.emit(s, notificationParams);
      //   });
      // }
    }
  }
}
const channelProvider = new ChannelProvider();

export {channelProvider};
