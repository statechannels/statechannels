import {Message} from '@statechannels/client-api-schema';
import _ from 'lodash';
import {Logger} from 'pino';

import {Wallet} from '..';

import {MessageHandler, MessageServiceInterface} from './types';

export type LatencyOptions = {
  /**
   * The mean delay to delay messages with. If undefined messages are not delayed
   * Otherwise each message is delayed by meanDelay / 2 + Math.random() * meanDelay);
   */
  meanDelay?: number;
  /**
   * How frequently a message should be dropped. Can range from 0 (never dropped) to 1(always dropped)
   */
  dropRate: number;
};

/**
 * A basic message service that is responsible for sending and receiving messages for a collection of wallets.
 * All the wallets will share the same message service.
 * The message service is responsible for calling pushMessage on the appropriate wallets.
 */
export class TestMessageService implements MessageServiceInterface {
  private _handleMessage: (message: Message) => Promise<void>;
  private _options: LatencyOptions;

  private _timeouts: NodeJS.Timeout[] = [];

  protected destroyed = false;
  /**
   * Creates a test message service that can be used in tets
   * @param incomingMessageHandler The message handler to use
   * @param logger An optional logger for logging

   * @returns
   */
  protected constructor(handleMessage: MessageHandler, protected _logger?: Logger) {
    this._options = {dropRate: 0, meanDelay: undefined};
    // We always pass a reference to the messageService when calling handleMessage
    // This allows the MessageHandler function to easily call messageHandler.send
    // We just bind that here for convenience.
    this._handleMessage = async message => handleMessage(message, this);
  }

  static async create(
    incomingMessageHandler: MessageHandler,

    logger?: Logger
  ): Promise<MessageServiceInterface> {
    const service = new TestMessageService(incomingMessageHandler, logger);
    return service;
  }
  public setLatencyOptions(incomingOptions: Partial<LatencyOptions>): void {
    this._options = _.merge(this._options, incomingOptions);
  }
  async send(messages: Message[]): Promise<void> {
    const shouldDrop = Math.random() > 1 - this._options.dropRate;

    if (!shouldDrop) {
      const {meanDelay} = this._options;
      if (meanDelay) {
        const delay = meanDelay / 2 + Math.random() * meanDelay;
        this._timeouts.push(
          setTimeout(async () => {
            await Promise.all(messages.map(this._handleMessage));
          }, delay)
        );
      } else {
        await Promise.all(messages.map(this._handleMessage));
      }
    }
  }

  async destroy(): Promise<void> {
    // This prevents any more progress from being made
    this._handleMessage = async () => _.noop();

    await Promise.all(this._timeouts.map(clearTimeout));
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
  wallets: {participantId: string; wallet: Wallet}[],
  logger?: Logger
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

    logger?.trace({message}, 'Pushing message into wallet');
    const result = await matching.wallet.pushMessage(message.data);

    await me.send(result.outbox.map(o => o.params));
  };
};
