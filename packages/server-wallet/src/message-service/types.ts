import {Message} from '@statechannels/client-api-schema';

/**
 * This is the handler that any messaging service implementation should call when receiving a message
 * The handler is responsible for pushing the message into the appropriate wallet
 */
export type MessageHandler = (message: Message) => Promise<void>;

/**
 * A MessageServiceFactory is responsible for generating a MessageService.
 * This is used by the Wallet to construct the messaging service that will be used.
 * The incomingMessageHandler will be supplied by the Wallet to handle messages.
 */
export type MessageServiceFactory = (
  incomingMessageHandler: MessageHandler
) => MessageServiceInterface;

export interface MessageServiceInterface {
  /**
   * Sends out the messages to the specified by participants.
   * @param messages The collection of messages to send
   */
  send(message: Message[]): Promise<void>;

  /**
   * This is called when the message service is no longer needed
   */
  destroy(): Promise<void>;
}
