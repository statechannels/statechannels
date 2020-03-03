import {Message as WireMessage} from '@statechannels/wire-format';
import * as R from 'ramda';
import {signState} from '@statechannels/xstate-wallet/lib/src/store/state-utils';
import {deserializeMessage} from '@statechannels/xstate-wallet/lib/src/serde/wire-format/deserialize';
import {serializeMessage} from '@statechannels/xstate-wallet/lib/src/serde/wire-format/serialize';
import {cHubStateChannelPK, cHubStateChannelAddress} from '../constants';
import {SignedState, Message, Participant} from '@statechannels/xstate-wallet/lib/src/store/types';

function broadcastRecipents(participants: Participant[]): Participant[] {
  return participants.filter(p => p.participantId !== cHubStateChannelAddress);
}

export function respondToMessage(wireMessage: WireMessage): WireMessage[] {
  const message = deserializeMessage(wireMessage);
  const lastState = R.last(message.signedStates);
  const ourSignature = signState(lastState, cHubStateChannelPK);
  const signatures = R.append(ourSignature, lastState.signatures);
  const ourSignedState: SignedState = {...lastState, signatures};
  const ourMessage: Message = {signedStates: [ourSignedState], objectives: message.objectives};
  return broadcastRecipents(lastState.participants).map(participant =>
    serializeMessage(ourMessage, participant.participantId, wireMessage.recipient)
  );
}
