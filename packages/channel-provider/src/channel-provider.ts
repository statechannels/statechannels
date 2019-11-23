import debug from 'debug';
import EventEmitter from 'eventemitter3';
import {MessagingService} from './messaging-service';
import {
  ChannelProviderUIMessage,
  IChannelProvider,
  JsonRpcRequest,
  JsonRpcSubscribeResult,
  JsonRpcUnsubscribeResult
} from './types';
import {UIService} from './ui-service';

const log = debug('channel-provider');

class ChannelProvider implements IChannelProvider {
  protected readonly events: EventEmitter;
  protected readonly ui: UIService;
  protected readonly messaging: MessagingService;

  protected url = 'http://localhost:1701';

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

    this.events.emit('connect');
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

  async subscribe(subscriptionType: string, params: any[] = []): Promise<string> {
    const response = await this.send<JsonRpcSubscribeResult>('chan_subscribe', [
      subscriptionType,
      ...params
    ]);

    return response.subscription;
  }

  async unsubscribe(subscriptionId: string): Promise<boolean> {
    const response = await this.send<JsonRpcUnsubscribeResult>('chan_unsubscribe', [
      subscriptionId
    ]);

    this.off(subscriptionId);

    return response.success;
  }

  on(event: string, callback: EventEmitter.ListenerFn<any[]>): void {
    this.events.on(event, callback);
  }

  off(event: string, callback?: EventEmitter.ListenerFn<any[]> | undefined): void {
    this.events.off(event, callback);
  }

  protected async onMessage(event: MessageEvent) {
    const message = event.data as ChannelProviderUIMessage | JsonRpcRequest;

    if (message === ChannelProviderUIMessage.Close) {
      log('Close signal received: %o', message);
      this.ui.unmount();
      return;
    }

    if (message === ChannelProviderUIMessage.Acknowledge) {
      this.messaging.acknowledge();
      return;
    }

    if (!message.jsonrpc || 'result' in message) {
      return;
    }

    const target = await this.ui.getTarget();
    this.messaging.send(target, message, this.url);
  }
}

const channelProvider = new ChannelProvider();

export {channelProvider};
