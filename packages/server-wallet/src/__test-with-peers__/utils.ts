import {ChannelResult, Message} from '@statechannels/client-api-schema';
import _ from 'lodash';

import {Wallet} from '..';
import {TestMessageService} from '../message-service/test-message-service';
import {MessageHandler, MessageServiceInterface} from '../message-service/types';
import {Notice} from '../protocols/actions';
import {MultipleChannelOutput, SingleChannelOutput} from '../wallet';

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
  const hasUniqueParticipants = new Set(wallets.map(w => w.participantId)).size === wallets.length;
  const hasUniqueWallets = new Set(wallets.map(w => w.wallet)).size === wallets.length;

  if (!hasUniqueParticipants) {
    throw new Error('Duplicate participant ids');
  }

  if (!hasUniqueWallets) {
    throw new Error('Duplicate wallets');
  }
  const messageHandler: MessageHandler = async (to, message, me) => {
    const matching = wallets.find(w => w.participantId === to);

    if (!matching) {
      throw new Error(`Invalid to value ${to}`);
    }
    const result = await matching.wallet.pushMessage(message);

    await me.send(result.outbox.map(o => o.params));
  };
  return TestMessageService.createTestMessageService(messageHandler);
}

function isOutput(something: any): something is SingleChannelOutput | MultipleChannelOutput {
  return 'outbox' in something;
}

/**
 * Takes in a variety of results and gets the messages that can be passed into the message service
 * @param outputOrOutbox Either the output of the API or the outbox
 * @returns messages that can be passed into the message service
 */
export function getMessages(
  outputOrOutbox: SingleChannelOutput | MultipleChannelOutput | Notice[]
): Message[] {
  if (isOutput(outputOrOutbox)) {
    return outputOrOutbox.outbox.map(o => o.params);
  } else {
    return outputOrOutbox.map(o => o.params);
  }
}
