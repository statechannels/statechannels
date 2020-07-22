import {ErrorResponse} from '@statechannels/client-api-schema';

import {logger} from './logger';
import {JsonRpcRequest, isJsonRpcResponse, isJsonRpcErrorResponse} from './types/jsonrpc';

export interface PostMessageServiceOptions {
  timeoutMs?: number;
  maxRetries?: number;
}

class RpcError extends Error {
  constructor(readonly error: ErrorResponse['error']) {
    super(error.message);
  }
}

export class PostMessageService {
  protected timeoutListener?: NodeJS.Timeout;
  protected attempts = 0;
  protected url = '';

  protected readonly timeoutMs: number;
  protected readonly maxRetries: number;

  constructor({timeoutMs, maxRetries}: PostMessageServiceOptions = {}) {
    this.timeoutMs = timeoutMs || -1;
    this.maxRetries = maxRetries || 0;
  }

  setUrl(url: string) {
    this.url = url;
  }

  send(target: Window, message: JsonRpcRequest, corsUrl: string) {
    this.attempts += 1;

    logger.info({message}, 'Sending message (attempt %s)', this.attempts);
    target.postMessage(message, corsUrl);
    logger.info({message}, 'Sent message:');

    if (this.timeoutMs >= 0) {
      this.timeoutListener = setTimeout(() => {
        if (this.attempts < this.maxRetries) {
          logger.info({message}, 'Request timed out after %o ms, retrying', this.timeoutMs);
          this.send(target, message, corsUrl);
        } else {
          logger.info(
            {message},
            'Request timed out after %o attempts; is the wallet unreachable?',
            this.attempts
          );
          logger.warn({message}, `Request timed out after ${this.attempts} attempts`);
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
    if (message.id) logger.error('message id should not be defined');

    // message IDs should be unique
    message.id = message.id || this.requestNumber++;

    return new Promise<ResultType>((resolve, reject) => {
      window.addEventListener(
        'message',
        this.createListenerForMessage(message, resolve, reject, callback)
      );

      logger.info({message}, 'Requesting:');

      this.send(target, message as JsonRpcRequest, this.url);
    });
  }

  acknowledge() {
    logger.info('ACK signal received');

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
      if (event.data && event.data.jsonrpc && event.data.id === message.id) {
        if (isJsonRpcResponse(event.data)) {
          if (callback) {
            callback(event.data.result);
          }
          this.acknowledge();
          window.removeEventListener('message', listener);
          logger.info({response: event.data}, 'Received response');
          resolve(event.data.result);
        } else if (isJsonRpcErrorResponse(event.data)) {
          reject(new RpcError(event.data.error));
        }
      }
    };

    return listener;
  }
}
