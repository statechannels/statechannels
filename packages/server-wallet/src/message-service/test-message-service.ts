import {Message} from '@statechannels/client-api-schema';
import _ from 'lodash';
import {Logger} from 'pino';

import {Wallet} from '..';

import {MessageHandler, MessageServiceInterface} from './types';

/**
 * A basic message service that is responsible for sending and receiving messages for a collection of wallets.
 * All the wallets will share the same message service.
 * The message service is responsible for calling pushMessage on the appropriate wallets.
 */
export class TestMessageService implements MessageServiceInterface {
  private _handleMessage: (message: Message) => Promise<void>;

  /**
   * Creates a test message service that can be used in tets
   * @param incomingMessageHandler The message handler to use
   * @param logger An optional logger for logging
   * @param dropRate A number between 0 and 1 which controls how often messages are dropped. 1 means all messages are dropped and 0 means none.
   * @returns
   */
  protected constructor(
    handleMessage: MessageHandler,
    protected _dropRate: number,
    protected _logger?: Logger
  ) {
    // We always pass a reference to the messageService when calling handleMessage
    // This allows the MessageHandler function to easily call messageHandler.send
    // We just bind that here for convenience.
    this._handleMessage = async message => handleMessage(message, this);
  }

  static async create(
    incomingMessageHandler: MessageHandler,
    logger?: Logger,
    dropRate = 0
  ): Promise<MessageServiceInterface> {
    const service = new TestMessageService(incomingMessageHandler, dropRate, logger);
    return service;
  }

  async send(messages: Message[]): Promise<void> {
    const randomValue = Math.random();
    const shouldDrop = randomValue > 1 - this._dropRate;
    if (shouldDrop) {
      this._logger?.trace(
        {
          messages,
          dropRate: this._dropRate,
          randomValue,
        },
        'Dropping messages'
      );
      return;
    }

    for (const message of messages) {
      await this._handleMessage(message);
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
