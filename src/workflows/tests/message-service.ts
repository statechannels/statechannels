import {Store} from '../../store';
import _ from 'lodash';
import {exists} from '../../utils';

export function subscribeToMessages(
  stores: Record<string, Pick<Store, 'pushMessage' | 'outboxFeed' | 'getAddress'>>
) {
  Object.values(stores).map(store =>
    store.outboxFeed.subscribe(message => {
      const participants = _.flatten(
        _.concat(
          message.signedStates?.map(s => s.participants),
          message.objectives?.map(m => m.participants)
        )
      );

      participants
        .filter(exists)
        .filter(p => p.signingAddress !== store.getAddress())
        .map(p => stores[p.participantId].pushMessage(message));
    })
  );
}
