import {Message} from '@statechannels/client-api-schema';

/**
 * This is the handler that any messaging service implementation should call when receiving a message
 * The handler is responsible for pushing the message into the appropriate wallet
 */
export type MessageHandler = (
  message: Message,
  messageService: MessageServiceInterface
) => Promise<void>;

/**
 * A MessageServiceFactory is responsible for generating a MessageService.
 * Eventually the wallet will require a MessageServiceFactory.
 * The wallet will use it to construct the messagingService that it can use to send messages.
 * messageHandler should be triggered whenever the messaging service receives a message.
 */
export type MessageServiceFactory = (
  incomingMessageHandler: MessageHandler
) => Promise<MessageServiceInterface>;

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
