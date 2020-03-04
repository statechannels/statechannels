import {Message as WireMessage} from '@statechannels/wire-format';
import * as R from 'ramda';
import {signState} from '@statechannels/xstate-wallet/lib/src/store/state-utils';
import {deserializeMessage} from '@statechannels/xstate-wallet/lib/src/serde/wire-format/deserialize';
import {serializeMessage} from '@statechannels/xstate-wallet/lib/src/serde/wire-format/serialize';
import {cHubStateChannelPK, cHubStateChannelAddress} from '../constants';
import {SignedState, Message, Participant} from '@statechannels/xstate-wallet/lib/src/store/types';

function containsHub(participant: Participant): boolean {
  return participant.participantId === cHubStateChannelAddress;
}
const notContainsHub = R.compose(R.not, containsHub);

function broadcastRecipients(states: SignedState[]): Participant[] {
  const allParticipantsWithDups = states
    .map(state => state.participants)
    .reduce((participantsSoFar, participants) => participantsSoFar.concat(participants), []);
  return R.intersection(allParticipantsWithDups, allParticipantsWithDups).filter(notContainsHub);
}

export function respondToMessage(wireMessage: WireMessage): WireMessage[] {
  const message = deserializeMessage(wireMessage);
  const statesWithHub = message.signedStates.filter(
    state => state.participants.filter(containsHub).length
  );
  const signedStates = statesWithHub.map(state => {
    const ourSignature = signState(state, cHubStateChannelPK);
    const signatures = R.append(ourSignature, state.signatures);
    return {...state, signatures};
  });
  const ourMessage: Message = {signedStates, objectives: message.objectives};

  return broadcastRecipients(signedStates).map(participant =>
    serializeMessage(ourMessage, participant.participantId, wireMessage.recipient)
  );
}
