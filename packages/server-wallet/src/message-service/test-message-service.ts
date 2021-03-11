import {Message} from '@statechannels/client-api-schema';
import _ from 'lodash';

import {MessageHandler, MessageServiceInterface} from './types';

export class TestMessageService implements MessageServiceInterface {
  protected constructor(private _receive: MessageHandler) {}

  static async createTestMessageService(
    incomingMessageHandler: MessageHandler
  ): Promise<MessageServiceInterface> {
    const service = new TestMessageService(incomingMessageHandler);
    return service;
  }

  async send(messages: Message[]): Promise<void> {
    for (const message of messages) {
      await this._receive(message.recipient, message.data, this);
    }
  }

  async destroy(): Promise<void> {
    // This prevents any more progress from being made
    this._receive = async () => _.noop();
  }
}
