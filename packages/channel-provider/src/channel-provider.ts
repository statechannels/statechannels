import EventEmitter from 'eventemitter3';
import {Guid} from 'guid-typescript';
import {MessagingService} from './messaging-service';
import {ChannelProviderInterface, isJsonRpcNotification} from './types';
import {UIService} from './ui-service';

class ChannelProvider implements ChannelProviderInterface {
  protected readonly events: EventEmitter;
  protected readonly ui: UIService;
  protected readonly messaging: MessagingService;
  protected readonly subscriptions: {[eventName: string]: string[]};
  protected url = '';

  constructor() {
    this.events = new EventEmitter();
    this.ui = new UIService();
    this.messaging = new MessagingService();
    this.subscriptions = {};
  }

  async enable(url?: string) {
    window.addEventListener('message', this.onMessage.bind(this));

    if (url) {
      this.url = url;
    }

    this.ui.setUrl(this.url);
    this.messaging.setUrl(this.url);

    await this.ui.mount();

    this.events.emit('Connect');
  }

  async send(method: string, params: any): Promise<any> {
    const target = await this.ui.getTarget();
    const response = await this.messaging.request(target, {
      jsonrpc: '2.0',
      method,
      params
    });

    return response;
  }

  async subscribe(subscriptionType: string): Promise<string> {
    const subscriptionId = Guid.create().toString();
    if (!this.subscriptions[subscriptionType]) {
      this.subscriptions[subscriptionType] = [];
    }
    this.subscriptions[subscriptionType].push(subscriptionId);
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<boolean> {
    Object.keys(this.subscriptions).map(e => {
      this.subscriptions[e] = this.subscriptions[e]
        ? this.subscriptions[e].filter(s => s !== subscriptionId)
        : [];
    });
    return true;
  }

  on(event: string, callback: EventEmitter.ListenerFn<any>): void {
    this.events.on(event, callback);
  }

  off(event: string, callback?: EventEmitter.ListenerFn<any> | undefined): void {
    this.events.off(event, callback);
  }

  protected async onMessage(event: MessageEvent) {
    const message = event.data;
    if (!message.jsonrpc) {
      return;
    }

    if (isJsonRpcNotification(message)) {
      const eventName = message.method;
      if (eventName === 'UIUpdate') {
        this.ui.setVisibility(message.params.showWallet);
      }
      this.events.emit(eventName, message);

      if (this.subscriptions[eventName]) {
        this.subscriptions[eventName].forEach(s => {
          this.events.emit(s, message);
        });
      }
    }
  }
}
const channelProvider = new ChannelProvider();

export {channelProvider};
