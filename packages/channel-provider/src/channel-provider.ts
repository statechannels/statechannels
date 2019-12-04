import EventEmitter from 'eventemitter3';
import {MessagingService} from './messaging-service';
import {
  EventType,
  IChannelProvider,
  isJsonRpcErrorResponse,
  isJsonRpcNotification,
  isJsonRpcResponse
} from './types';
import {UIService} from './ui-service';

class ChannelProvider implements IChannelProvider {
  protected readonly events: EventEmitter;
  protected readonly ui: UIService;
  protected readonly messaging: MessagingService;

  protected url = '';

  constructor() {
    this.events = new EventEmitter();
    this.ui = new UIService();
    this.messaging = new MessagingService();
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

  async send<ResultType = any>(method: string, params: any[] = []): Promise<ResultType> {
    const target = await this.ui.getTarget();
    const response = (await this.messaging.request(target, {
      jsonrpc: '2.0',
      method,
      params
    })) as ResultType;

    return response;
  }

  // TODO: Do we want to implement subscriptions?
  async subscribe(_subscriptionType: string, _params: any[] = []): Promise<string> {
    throw new Error('Subscriptions are not implemented');
  }

  async unsubscribe(_subscriptionId: string): Promise<boolean> {
    throw new Error('Subscriptions are not implemented');
  }

  on(event: EventType, callback: EventEmitter.ListenerFn<any[]>): void {
    this.events.on(event, callback);
  }

  off(event: EventType, callback?: EventEmitter.ListenerFn<any[]> | undefined): void {
    this.events.off(event, callback);
  }
  onNotification(callback: EventEmitter.ListenerFn<any[]>): void {
    this.events.on('Notification', callback);
  }

  offNotification(callback?: EventEmitter.ListenerFn<any[]> | undefined): void {
    this.events.off('Notification', callback);
  }

  protected async onMessage(event: MessageEvent) {
    const message = event.data;
    if (!message.jsonrpc) {
      return;
    }

    if (isJsonRpcErrorResponse(message)) {
      this.events.emit('MessageError', message);
    } else if (isJsonRpcResponse(message)) {
      this.events.emit('MessageResult', message);
    } else if (isJsonRpcNotification(message)) {
      if (message.method === 'UIUpdate') {
        this.ui.setVisibility(message.params.showWallet);
      }
      this.events.emit('Notification', message);
    }
  }
}
const channelProvider = new ChannelProvider();

export {channelProvider};
