import {ChannelResult} from '@statechannels/client-api-schema';
import _ from 'lodash';

import {Notice} from '../protocols/actions';
import {WireMessage} from '../type-aliases';
import {WALLET_VERSION} from '../version';

// Merges any messages to the same recipient into one message
// This makes message delivery less painful with the request/response model
export function mergeOutgoing(outgoing: Notice[]): Notice[] {
  if (outgoing.length === 0) return outgoing;

  const senders = outgoing.map(o => o.params.sender);
  const differentSender = new Set(senders).size !== 1;
  // This should never happen but it's nice to have a sanity
  if (differentSender) {
    throw new Error(`Trying to merge outgoing messages with multiple recipients ${senders}`);
  }

  const {sender} = outgoing[0].params;

  const messages = outgoing.map(o => o.params as WireMessage);

  return _.map(
    _.groupBy(messages, o => o.recipient),
    (rcptMsgs, recipient) => {
      const states = uniqueAndSorted(rcptMsgs.flatMap(n => n.data.signedStates || []));
      const requests = uniqueAndSorted(rcptMsgs.flatMap(n => n.data.requests || []));
      const objectives = uniqueAndSorted(rcptMsgs.flatMap(n => n.data.objectives || []));

      return {
        method: 'MessageQueued' as const,
        params: {
          sender,
          recipient,
          data: {
            walletVersion: WALLET_VERSION,
            signedStates: states.length > 0 ? states : undefined,
            requests: requests.length > 0 ? requests : undefined,
            objectives: objectives.length > 0 ? objectives : undefined,
          },
        },
      };
    }
  );
}

function uniqueAndSorted<T>(array: T[]): T[] {
  return _.orderBy(_.uniqWith(array, _.isEqual), ['channelId', 'turnNum'], ['desc', 'asc']);
}

export function mergeChannelResults(channelResults: ChannelResult[]): ChannelResult[] {
  const sorted = _.orderBy(channelResults, ['channelId', 'turnNum'], ['desc', 'desc']);

  return _.sortedUniqBy(sorted, a => a.channelId);
}
