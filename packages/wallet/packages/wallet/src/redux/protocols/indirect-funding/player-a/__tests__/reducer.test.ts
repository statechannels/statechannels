import { MESSAGE_RELAY_REQUESTED } from 'magmo-wallet-client';
import { addHex } from '../../../../../utils/hex-utils';
import * as SigningUtil from '../../../../../utils/signing-utils';
import * as actions from '../../../../actions';
import * as channelStates from '../../../../channel-state/state';
import { ProtocolStateWithSharedData } from '../../../../protocols';
import { itSendsThisMessage, itTransitionsToChannelStateType } from '../../../../__tests__/helpers';
import * as testScenarios from '../../../../__tests__/test-scenarios';
import {} from '../../../../__tests__/test-scenarios';
import { playerAReducer, initialize } from '../reducer';
import * as states from '../state';
import * as scenarios from './scenarios';

const startingIn = stage => `start in ${stage}`;
const whenActionArrives = action => `incoming action ${action}`;

function itTransitionToStateType(state, type) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}
function itTransitionsChannelToStateType(
  state: ProtocolStateWithSharedData<states.PlayerAState>,
  stateChannelId: string,
  type,
) {
  const channelState = state.sharedData.channelState.initializedChannels[stateChannelId];
  itTransitionsToChannelStateType(type, { state: channelState });
}

const channelId = testScenarios.channelId;
const ledgerId = testScenarios.ledgerId;

const validateMock = jest.fn().mockReturnValue(true);
Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

describe('initializing the protocol', () => {
  const sharedData = scenarios.happyPath.sharedData;
  const result = initialize(channelId, sharedData);
  itTransitionToStateType(result, states.WAIT_FOR_APPROVAL);
});

describe(startingIn(states.WAIT_FOR_APPROVAL), () => {
  const state = scenarios.happyPath.states.waitForApproval;

  describe(whenActionArrives(actions.indirectFunding.playerA.STRATEGY_APPROVED), () => {
    const action = actions.indirectFunding.playerA.strategyApproved(
      channelId,
      testScenarios.ledgerChannel.channelType,
    );
    const updatedState = playerAReducer(state.protocolState, state.sharedData, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_PRE_FUND_SETUP_1);
    itSendsThisMessage(updatedState.sharedData, MESSAGE_RELAY_REQUESTED);
    const newLedgerId = (updatedState.protocolState as states.WaitForDirectFunding).ledgerId;
    itTransitionsChannelToStateType(
      updatedState,
      newLedgerId,
      channelStates.WAIT_FOR_PRE_FUND_SETUP,
    );
  });
});

describe(startingIn(states.WAIT_FOR_PRE_FUND_SETUP_1), () => {
  const state = scenarios.happyPath.states.waitForPreFundSetup1;

  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const action = actions.commitmentReceived(
      ledgerId,
      testScenarios.ledgerCommitments.preFundCommitment1,
      '0x0',
    );
    const updatedState = playerAReducer(state.protocolState, state.sharedData, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_DIRECT_FUNDING);
    itTransitionsChannelToStateType(
      updatedState,
      ledgerId,
      channelStates.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP,
    );
  });
});

// TODO: fails now that direct funding includes post fund messages
it.skip(startingIn(states.WAIT_FOR_DIRECT_FUNDING), () => {
  const total = testScenarios.twoThree.reduce(addHex);

  const state = scenarios.happyPath.states.waitForDirectFunding;

  describe(whenActionArrives(actions.FUNDING_RECEIVED_EVENT), () => {
    const action = actions.fundingReceivedEvent('processId', ledgerId, total, total);
    const updatedState = playerAReducer(state.protocolState, state.sharedData, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_POST_FUND_SETUP_1);
    itTransitionsChannelToStateType(
      updatedState,
      ledgerId,
      channelStates.A_WAIT_FOR_POST_FUND_SETUP,
    );
  });
});

describe(startingIn(states.WAIT_FOR_POST_FUND_SETUP_1), () => {
  const state = scenarios.happyPath.states.waitForPostFundSetup1;
  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const action = actions.commitmentReceived(
      ledgerId,
      testScenarios.ledgerCommitments.postFundCommitment1,
      '0x0',
    );
    const updatedState = playerAReducer(state.protocolState, state.sharedData, action);
    itTransitionToStateType(updatedState, states.WAIT_FOR_LEDGER_UPDATE_1);
    itTransitionsChannelToStateType(
      updatedState,
      ledgerId,

      channelStates.WAIT_FOR_UPDATE,
    );
  });
});

describe(startingIn(states.WAIT_FOR_LEDGER_UPDATE_1), () => {
  const state = scenarios.happyPath.states.waitForLedgerUpdate1;
  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const action = actions.commitmentReceived(
      ledgerId,
      testScenarios.ledgerCommitments.ledgerUpdate1,
      '0x0',
    );
    playerAReducer(state.protocolState, state.sharedData, action);
    // TODO: We need a "finished" state to test against
  });
});
