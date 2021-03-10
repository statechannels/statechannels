import {Message} from '@statechannels/client-api-schema';

import {Wallet} from '../wallet';

import {MessageHandler, MessageServiceInterface} from './types';

export class TestMessageService implements MessageServiceInterface {
  protected constructor(private _receive: MessageHandler) {}

  static async createTestMessageService(
    messageHandler: MessageHandler
  ): Promise<MessageServiceInterface> {
    const service = new TestMessageService(messageHandler);
    return service;
  }

  async send(messages: Message[]): Promise<void> {
    for (const message of messages) {
      await this._receive(message.recipient, message.data, this);
    }
  }
}

/**
 * This is a helper method that sets up a message service for a collection of wallets.
 * Whenever handleMessages or send are called they are pushed into the appropriate wallet.
 * Any response to the pushMessage is then sent to the other participants
 * @param wallets The collection of wallets that will be communicating. A participantId must be provided for each wallet.
 * @returns A messaging service that can be used to send messages.
 * @example
 * const ms = setupTestMessagingService(...bla);
 * const result = wallet.createChannel(..bla);
 *
 * // This will send all the messages from the result of the create channel call
 * // and will handle any responses to those messages and so on...
 * await ms.handleMessages(result.outbox);
 */
export function setupTestMessagingService(
  wallets: {participantId: string; wallet: Wallet}[]
): Promise<MessageServiceInterface> {
  const messageHandler: MessageHandler = async (to, message, me) => {
    // TODO: This assumes only 1 matching wallet.
    const matching = wallets.find(w => w.participantId === to);

    if (!matching) {
      throw new Error(`Invalid to value ${to}`);
    }
    const result = await matching.wallet.pushMessage(message);

    await me.send(result.outbox.map(o => o.params));
  };
  return TestMessageService.createTestMessageService(messageHandler);
}
