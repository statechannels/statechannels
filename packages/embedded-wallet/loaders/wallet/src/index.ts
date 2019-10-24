import debug from 'debug';
import EventEmitter, {ListenerFn} from 'eventemitter3';
import {JsonRPCRequest} from 'web3/providers';
import {EmbeddedWalletContainerStyles} from './style-definitions';
import {JsonRpcSubscribeResult} from './types';

const log = debug('wallet:bridge');

let timeoutListener: NodeJS.Timeout;
let attempts = 0;
const timeoutMs = 50;
const maxRetries = 5;

const events = new EventEmitter();

const getWalletFrame = (): Promise<Window> => {
  return new Promise(resolve => {
    let walletIframe = document.querySelector('iframe#wallet') as HTMLIFrameElement;
    if (!walletIframe) {
      const style = document.createElement('style');
      style.innerHTML = EmbeddedWalletContainerStyles;
      document.head.appendChild(style);
      const walletContainer = document.createElement('div');
      walletContainer.id = 'walletContainer';
      walletIframe = document.createElement('iframe');
      walletIframe.id = 'wallet';
      walletIframe.src = ChannelProvider.url;
      document.body.appendChild(walletIframe);
      document.body.appendChild(walletContainer);

      walletIframe.onload = () => {
        log('Iframe loaded');
        resolve(walletIframe.contentWindow as Window);
      };
    } else {
      log('Iframe already exists');
      resolve(walletIframe.contentWindow as Window);
    }
  });
};

const request = <ResultType = any>(
  message: Omit<JsonRPCRequest, 'id'> & {id?: number},
  callback?: (result: any) => void,
  url?: string
): Promise<ResultType> => {
  if (!message.id) {
    message.id = Date.now();
  }

  return new Promise((resolve, reject) => {
    let listener: (event: MessageEvent) => void;

    if (callback) {
      listener = (event: MessageEvent) => {
        if (event.data && event.data.jsonrpc && event.data.result && event.data.id === message.id) {
          callback(event.data.result);
          window.removeEventListener('message', listener);
          log('Received response: %o', event.data);
          resolve(event.data.result);
        } else if (event.data.error) {
          reject(event.data.error);
        }
      };
    } else {
      listener = event => {
        if (event.data && event.data.jsonrpc && event.data.result && event.data.id === message.id) {
          window.removeEventListener('message', listener);
          log('Received response: %o', event.data);
          resolve(event.data.result);
        } else if (event.data.error) {
          reject(event.data.error);
        }
      };
    }

    window.addEventListener('message', listener);
    log('Requesting: %o', message);

    getWalletFrame().then(contentWindow =>
      relayMessage(contentWindow, message as JsonRPCRequest, url || ChannelProvider.url)
    );
  });
};

const relayMessage = (contentWindow: Window, message: JsonRPCRequest, url: string) => {
  attempts += 1;

  log('Relaying message: %o (attempt %o)', message, attempts);
  contentWindow.postMessage(message, url);
  log('Relayed message: %o', message);

  timeoutListener = setTimeout(() => {
    if (attempts < maxRetries) {
      log('Request %o timed out after %o ms, retrying', message, timeoutMs);
      relayMessage(contentWindow, message, url);
    } else {
      log('Request %o timed out after %o attempts; is wallet unreachable?', message, attempts);
    }
  }, timeoutMs);
};

const onMessage = (event: MessageEvent) => {
  const message = event.data;

  if (message === 'ui:wallet:close') {
    log('Close signal received: %o', message);
    document.querySelector('iframe#wallet')!.remove();
    document.querySelector('#walletContainer')!.remove();
    log('Iframe removed');
    return;
  }

  if (message === 'ui:wallet:ack') {
    log('ACK signal received');
    clearTimeout(timeoutListener);
    attempts = 0;
    return;
  }

  if (!message.jsonrpc || message.result) {
    return;
  }

  getWalletFrame().then(contentWindow => relayMessage(contentWindow, message, ChannelProvider.url));
};

class ChannelProvider {
  static url = 'http://localhost:1701';

  static async enable(url?: string) {
    window.addEventListener('message', onMessage);

    if (url) {
      ChannelProvider.url = url;
    }

    events.emit('connect');
  }

  static async send(method: string, params: any[] = []) {
    return request({
      jsonrpc: '2.0',
      method,
      params
    });
  }

  static async subscribe(subscriptionType: string, params = []) {
    try {
      const response = await request<JsonRpcSubscribeResult>({
        jsonrpc: '2.0',
        method: 'chan_subscribe',
        params: [subscriptionType, ...params]
      });

      return response.subscription;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to subscribe');
    }
  }

  static async unsubscribe(subscriptionId: string) {
    try {
      await request({
        jsonrpc: '2.0',
        method: 'chan_unsubscribe',
        params: [subscriptionId]
      });
    } catch (error) {
      console.error(error);
      throw new Error('Failed to unsubscribe');
    }

    events.off(subscriptionId);
    return true;
  }

  static on(event: string, callback: ListenerFn) {
    events.on(event, callback);
  }

  static off(event: string, callback?: ListenerFn) {
    events.off(event, callback);
  }
}

export {ChannelProvider};
