import * as R from 'ramda';
import {cHubChannelPK} from '../constants';
import {Message, signState} from './xstate-wallet-internals';
import {containsHub} from '../utils';

export function respondToMessage(message: Message): Message {
  const statesWithHub = message.signedStates.filter(
    state => state.participants.some(containsHub)
  );
  const signedStates = statesWithHub.map(state => {
    const ourSignature = signState(state, cHubChannelPK);
    const signatures = R.append(ourSignature, state.signatures);
    return {...state, signatures};
  });
  return {signedStates, objectives: message.objectives};
}
