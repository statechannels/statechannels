import {Store} from '../../store';
import _ from 'lodash';
import {exists} from '../../utils';

export function subscribeToMessages(
  stores: Record<string, Pick<Store, 'pushMessage' | 'outboxFeed' | 'getAddress'>>,
  log = false
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
            log &&
              console.log(`${participantId} to ${p.participantId}: ${JSON.stringify(message)}`);
            return stores[p.participantId].pushMessage(message);
          });
      });
    });
  });
}
