import {ChannelResult, Message} from '@statechannels/client-api-schema';
import _ from 'lodash';

import {Wallet} from '..';
import {Notice} from '../protocols/actions';
import {MultipleChannelOutput, SingleChannelOutput} from '../wallet';

export async function expectLatestStateToMatch(
  channelId: string,
  wallet: Wallet,
  partial: Partial<ChannelResult>
): Promise<void> {
  const latest = await wallet.getState({channelId});
  expect(latest.channelResult).toMatchObject(partial);
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
