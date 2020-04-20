import debug from 'debug';
import {JsonRpcRequest} from './types';

const log = debug('channel-provider:messaging');

export interface MessagingServiceOptions {
  timeoutMs?: number;
  maxRetries?: number;
}

export class MessagingService {
  protected timeoutListener?: NodeJS.Timeout;
  protected attempts = 0;
  protected url = '';

  protected readonly timeoutMs: number;
  protected readonly maxRetries: number;

  constructor({timeoutMs, maxRetries}: MessagingServiceOptions = {}) {
    this.timeoutMs = timeoutMs || -1;
    this.maxRetries = maxRetries || 0;
  }

  setUrl(url: string) {
    this.url = url;
  }

  send(target: Window, message: JsonRpcRequest, corsUrl: string) {
    this.attempts += 1;

    log('Sending message: %o (attempt #%o)', message, this.attempts);
    target.postMessage(message, corsUrl);
    log('Sent message: %o', message);

    if (this.timeoutMs >= 0) {
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
  }

  private requestNumber = 0;
  async request<ResultType = any>(
    target: Window,
    message: JsonRpcRequest,
    callback?: (result: ResultType) => void
  ): Promise<ResultType> {
    // Some tests rely on being able to supply the id on the message
    // We should not allow this in production, as we cannot guarantee unique
    // message ids.
    if (message.id) console.error('message id should not be defined');

    // TODO: I don't know the requirements on message IDs, but it's important
    // that they be unique
    message.id = message.id || this.requestNumber++;

    return new Promise<ResultType>((resolve, reject) => {
      window.addEventListener(
        'message',
        this.createListenerForMessage(message, resolve, reject, callback)
      );

      log('Requesting: %o', message);

      this.send(target, message as JsonRpcRequest, this.url);
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
    message: JsonRpcRequest,
    resolve: (value?: ResultType) => void,
    reject: (reason?: any) => void,
    callback?: (result: ResultType) => void
  ) {
    const listener = (event: MessageEvent) => {
      if (event.data && event.data.jsonrpc && event.data.result && event.data.id === message.id) {
        if (callback) {
          callback(event.data.result);
        }
        this.acknowledge();
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
