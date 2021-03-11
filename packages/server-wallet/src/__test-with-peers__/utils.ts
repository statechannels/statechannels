import {ChannelResult} from '@statechannels/client-api-schema';

import {Wallet} from '..';
import {TestMessageService} from '../message-service/test-message-service';
import {MessageHandler, MessageServiceInterface} from '../message-service/types';

// TODO: Is there a cleaner way of writing this?
export async function expectLatestStateToMatch(
  channelId: string,
  wallet: Wallet,
  partial: Partial<ChannelResult>
): Promise<void> {
  const latest = await wallet.getState({channelId});
  expect(latest.channelResult).toMatchObject(partial);
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
