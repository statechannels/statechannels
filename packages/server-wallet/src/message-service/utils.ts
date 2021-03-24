import {Message} from '@statechannels/client-api-schema';

import {SingleChannelOutput, MultipleChannelOutput} from '..';
import {Notice} from '../protocols/actions';

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

function isOutput(something: any): something is SingleChannelOutput | MultipleChannelOutput {
  return 'outbox' in something;
}
