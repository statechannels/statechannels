import {Server} from 'socket.io';
import {io, Socket as ClientSocket} from 'socket.io-client';
import {Message} from '@statechannels/client-api-schema';

import {MessageHandler, MessageServiceFactory, MessageServiceInterface} from './types';

export class SocketIOMessageService implements MessageServiceInterface {
  private server: Server;
  private peers: ClientSocket[] = [];
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

  public async send(messages: Message[]): Promise<void> {
    if (messages.length > 0) {
      this.server.emit('message', messages);
    }
  }

  public async destroy(): Promise<void> {
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
