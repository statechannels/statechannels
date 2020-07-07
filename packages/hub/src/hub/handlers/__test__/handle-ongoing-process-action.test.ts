import {signState, State} from '@statechannels/nitro-protocol';

import {SignedStatesReceived} from '../../../communication';
import {EmbeddedProtocol} from '../../../constants';
import {PARTICIPANT_1_PRIVATE_KEY} from '../../../test/test-constants';
import {stateConstructors} from '../../../test/test-data';
import {handleOngoingProcessAction} from '../handle-ongoing-process-action';

describe('handle-ongoing-process-action', () => {
  it('postfund signed states received', async () => {
    const state: State = stateConstructors.postfundSetup(2);
    const signedStatesReceivedAction: SignedStatesReceived = {
      type: 'WALLET.COMMON.SIGNED_STATES_RECEIVED',
      processId: '1234',
      protocolLocator: [EmbeddedProtocol.AdvanceChannel as any],
      signedStates: [signState(state, PARTICIPANT_1_PRIVATE_KEY)]
    };
    const messageReleayRequested = await handleOngoingProcessAction(signedStatesReceivedAction);

    expect(messageReleayRequested).toHaveLength(1);

    const states: State[] = (messageReleayRequested[0]
      .data as SignedStatesReceived).signedStates.map(signedState => signedState.state);
    expect(states).toEqual([state, stateConstructors.postfundSetup(3)]);
  });
});
