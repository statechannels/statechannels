import {Message} from '@statechannels/client-api-schema';
import _ from 'lodash';

import {Wallet} from '..';

import {MessageHandler, MessageServiceInterface} from './types';

/**
 * A basic message service that is responsible for sending and receiving messages for a collection of wallets.
 * All the wallets will share the same message service.
 * The message service is responsible for calling pushMessage on the appropriate wallets.
 */
export class TestMessageService implements MessageServiceInterface {
  protected constructor(private _handleMessage: MessageHandler) {}

  static async createTestMessageService(
    incomingMessageHandler: MessageHandler
  ): Promise<MessageServiceInterface> {
    const service = new TestMessageService(incomingMessageHandler);
    return service;
  }

  async send(messages: Message[]): Promise<void> {
    for (const message of messages) {
      await this._handleMessage(message, this);
    }
  }

  async destroy(): Promise<void> {
    // This prevents any more progress from being made
    this._handleMessage = async () => _.noop();
  }
}

/**
 * This is a helper method that sets up a message service for a collection of wallets.
 * Whenever handleMessages or send are called they are pushed into the appropriate wallet.
 * Any response to the pushMessage is then sent to the other participants
 * @param wallets The collection of wallets that will be communicating. A participantId must be provided for each wallet.
 * @returns A messaging service that is responsible for calling pushMessage on the correct wallet.
 * @example
 * const handler = createTestMessageHandler(..bla)
 * const ms = createTestMessageHandler(handler)
 * const result = wallet.createChannel(..bla);
 *
 * // This will send all the messages from the result of the create channel call
 * // and will handle any responses to those messages and so on...
 * await ms.handleMessages(result.outbox);
 */
export const createTestMessageHandler = (
  wallets: {participantId: string; wallet: Wallet}[]
): MessageHandler => {
  const hasUniqueParticipants = new Set(wallets.map(w => w.participantId)).size === wallets.length;
  const hasUniqueWallets = new Set(wallets.map(w => w.wallet)).size === wallets.length;

  if (!hasUniqueParticipants) {
    throw new Error('Duplicate participant ids');
  }

  if (!hasUniqueWallets) {
    throw new Error('Duplicate wallets');
  }
  return async (message, me) => {
    const matching = wallets.find(w => w.participantId === message.recipient);

    if (!matching) {
      throw new Error(`Invalid recipient ${message.recipient}`);
    }
    const result = await matching.wallet.pushMessage(message.data);

    await me.send(result.outbox.map(o => o.params));
  };
};
