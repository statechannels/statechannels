import {State} from '@statechannels/nitro-protocol';
import {signState} from '@statechannels/nitro-protocol/lib/src/signatures';
import {EmbeddedProtocol, SignedStatesReceived} from '@statechannels/wallet/lib/src/communication';
import {PARTICIPANT_1_ADDRESS, PARTICIPANT_1_PRIVATE_KEY} from '../../../test/test-constants';
import {stateConstructors} from '../../../test/test_data';
import {handleOngoingProcessAction} from '../handle-ongoing-process-action';

describe('handle-ongoing-process-action', () => {
  it('postfund signed states received', async () => {
    const state: State = stateConstructors.post_fund_setup(2);
    const signedStatesReceivedAction: SignedStatesReceived = {
      type: 'WALLET.COMMON.SIGNED_STATES_RECEIVED',
      processId: '1234',
      protocolLocator: [EmbeddedProtocol.AdvanceChannel],
      signedStates: [signState(state, PARTICIPANT_1_PRIVATE_KEY)]
    };
    const messageReleayRequested = await handleOngoingProcessAction(signedStatesReceivedAction);

    expect(messageReleayRequested).toHaveLength(1);
    expect(messageReleayRequested[0].to).toEqual(PARTICIPANT_1_ADDRESS);
    const states: State[] = messageReleayRequested[0].messagePayload.signedStates.map(
      signedState => signedState.state
    );
    expect(states).toEqual([state, stateConstructors.post_fund_setup(3)]);
  });
});
