import {Message as WireMessage} from '@statechannels/wire-format';
import * as R from 'ramda';
import {signState} from '@statechannels/xstate-wallet/lib/src/store/state-utils';
import {deserializeMessage} from '@statechannels/xstate-wallet/lib/src/serde/wire-format/deserialize';
import {serializeMessage} from '@statechannels/xstate-wallet/lib/src/serde/wire-format/serialize';
import {cHubStateChannelPK} from '../constants';
import {SignedState, Message} from '@statechannels/xstate-wallet/lib/src/store/types';

export function respondToMessage(wireMessage: WireMessage): WireMessage {
  const message = deserializeMessage(wireMessage);
  const lastState = R.last(message.signedStates);
  const ourSignature = signState(lastState, cHubStateChannelPK);
  const signatures = R.append(ourSignature, lastState.signatures);
  const ourSignedState: SignedState = {...lastState, signatures};
  const ourMessage: Message = {signedStates: [ourSignedState], objectives: message.objectives};
  const serializedMessage = serializeMessage(ourMessage, wireMessage.sender, wireMessage.recipient);
  return serializedMessage;
}
