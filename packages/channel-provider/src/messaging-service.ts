import debug from 'debug';
import {JsonRPCRequest} from 'web3/providers';
import {Message} from './types';

const log = debug('channel-provider:messaging');

export type MessagingServiceOptions = {
  timeoutMs?: number;
  maxRetries?: number;
};

export class MessagingService {
  protected timeoutListener?: NodeJS.Timeout;
  protected attempts: number = 0;
  protected url: string = '';

  protected readonly timeoutMs: number;
  protected readonly maxRetries: number;

  constructor({timeoutMs = 50, maxRetries = 5}: MessagingServiceOptions = {}) {
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
  }

  setUrl(url: string) {
    this.url = url;
  }

  send(target: Window, message: JsonRPCRequest, corsUrl: string) {
    this.attempts += 1;

    log('Sending message: %o (attempt #%o)', message, this.attempts);
    target.postMessage(message, corsUrl);
    log('Sent message: %o', message);

    this.timeoutListener = setTimeout(() => {
      if (this.attempts < this.maxRetries) {
        log('Request %o timed out after %o ms, retrying', message, this.timeoutMs);
        this.send(target, message, corsUrl);
      } else {
        log(
          'Request %o timed out after %o attempts; is the wallet unreachable?',
          message,
          this.attempts
        );
        console.warn(`Request timed out after ${this.attempts} attempts`, message);
      }
    }, this.timeoutMs);
  }

  async request<ResultType = any>(
    target: Window,
    message: Message,
    callback?: (result: ResultType) => void
  ): Promise<ResultType> {
    if (!message.id) {
      message.id = Date.now();
    }

    return new Promise<ResultType>((resolve, reject) => {
      window.addEventListener(
        'message',
        this.createListenerForMessage(message, resolve, reject, callback)
      );

      log('Requesting: %o', message);

      this.send(target, message as JsonRPCRequest, this.url);
    });
  }

  acknowledge() {
    log('ACK signal received');

    if (this.timeoutListener) {
      clearTimeout(this.timeoutListener);
    }

    this.attempts = 0;
  }

  protected createListenerForMessage<ResultType = any>(
    message: Message,
    resolve: (value?: ResultType) => void,
    reject: (reason?: any) => void,
    callback?: (result: ResultType) => void
  ) {
    const listener = (event: MessageEvent) => {
      if (event.data && event.data.jsonrpc && event.data.result && event.data.id === message.id) {
        if (callback) {
          callback(event.data.result);
        }

        window.removeEventListener('message', listener);
        log('Received response: %o', event.data);
        resolve(event.data.result);
      } else if (event.data.error) {
        reject(event.data.error);
      }
    };

    return listener;
  }
}
