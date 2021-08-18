import {Server} from 'socket.io';
import {io, Socket as ClientSocket} from 'socket.io-client';
import {Message} from '@statechannels/client-api-schema';
import delay from 'delay';
import {AbortController} from 'abort-controller';

import {MessageHandler, MessageServiceFactory, MessageServiceInterface} from './types';
import {LatencyOptions} from './test-message-service';

export class SocketIOMessageService implements MessageServiceInterface {
  private server: Server;
  private peers: ClientSocket[] = [];

  private _abortController = new AbortController();
  private _latencyOptions: LatencyOptions = {meanDelay: undefined, dropRate: 0};
  constructor(private handler: MessageHandler, hostName: string, port: number) {
    this.server = new Server();
    this.server.listen(port);
  }
  public async registerPeer(url: string): Promise<void> {
    const socket = io(url);
    socket.on('message', async (messages: Message[]) => {
      for (const m of messages) {
        await this.handler(m);
      }
    });

    this.peers.push(socket);
  }

  public setLatencyOptions(options: LatencyOptions): void {
    this._latencyOptions = options;
  }

  public async send(messages: Message[]): Promise<void> {
    const shouldDrop = Math.random() > 1 - this._latencyOptions.dropRate;

    if (!shouldDrop) {
      const {meanDelay} = this._latencyOptions;
      if (meanDelay && meanDelay > 0) {
        const delayAmount = meanDelay / 2 + Math.random() * meanDelay;

        await delay(delayAmount, {signal: this._abortController.signal});
      }
      this.server.emit('message', messages);
    }
  }

  public async destroy(): Promise<void> {
    this._abortController.abort();
    this.server.close();

    for (const p of this.peers) {
      p.disconnect();
    }
  }

  public static async createFactory(
    hostname: string,
    port: number
  ): Promise<MessageServiceFactory> {
    return (handler: MessageHandler) => new SocketIOMessageService(handler, hostname, port);
  }
}
