import * as _ from 'lodash/fp';

import {cHubChannelPK} from '../constants';
import {Message, signState} from './xstate-wallet-internals';
import {containsHubSigningAddress} from '../utils';
import {log} from '../logger';

export function respondToMessage(message: Message): Message {
  log.info('Responding to message');
  log.info(message);

  const statesWithHub = message.signedStates.filter(state =>
    state.participants.some(containsHubSigningAddress)
  );
  const signedStates = statesWithHub.map(state => {
    const ourSignature = signState(state, cHubChannelPK);
    const signatures = _.concat(state.signatures, ourSignature);
    return {...state, signatures};
  });
  return {signedStates, objectives: message.objectives};
}
