import {Store} from '@statechannels/wallet-core/lib/src/store';
import _ from 'lodash';
import {exists} from '@statechannels/wallet-core/lib/src/utils';
import {ADD_LOGS} from '../../config';
import {logger} from '../../logger';
const log = logger.info.bind(logger);

export function subscribeToMessages(
  stores: Record<string, Pick<Store, 'pushMessage' | 'outboxFeed' | 'getAddress'>>
) {
  Object.keys(stores).map(participantId => {
    const store = stores[participantId];
    store.outboxFeed.subscribe(message => {
      const participants = _.flatten(
        _.concat(
          message.signedStates?.map(s => s.participants),
          message.objectives?.map(m => m.participants)
        )
      );
      store.getAddress().then(address => {
        participants
          .filter(exists)
          .filter(p => p.signingAddress !== address)
          .map(p => {
            ADD_LOGS && log({message}, `${participantId} to ${p.participantId}:`);
            return stores[p.participantId].pushMessage(message);
          });
      });
    });
  });
}
