import * as states from '../state';
import * as actions from '../../../../actions';
import { playerAReducer } from '../reducer';
import * as channelStates from '../../../../channel-state/state';
import { PlayerIndex } from 'magmo-wallet-client/lib/wallet-instructions';
import { itSendsThisMessage, itTransitionsToChannelStateType } from '../../../../__tests__/helpers';
import { MESSAGE_RELAY_REQUESTED } from 'magmo-wallet-client';
import * as SigningUtil from '../../../../../utils/signing-utils';
import {} from '../../../../__tests__/test-scenarios';
import * as testScenarios from '../../../../__tests__/test-scenarios';
import { addHex } from '../../../../../utils/hex-utils';
import { ProtocolStateWithSharedData } from '../../../../protocols';
import { EMPTY_OUTBOX_STATE } from '../../../../outbox/state';

const startingIn = stage => `start in ${stage}`;
const whenActionArrives = action => `incoming action ${action}`;

function itTransitionToStateType(state, type) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}
function itTransitionsChannelToStateType(
  state: ProtocolStateWithSharedData<states.PlayerAState>,
  channelId: string,
  type,
) {
  const channelState = state.sharedData.channelState.initializedChannels[channelId];
  itTransitionsToChannelStateType(type, { state: channelState });
}

const defaults = {
  ...testScenarios,
  ourIndex: PlayerIndex.A,
  privateKey: testScenarios.asPrivateKey,
  directFundingState: testScenarios.ledgerDirectFundingStates.playerA,
};

const ledgerChannelDefaults = {
  ...defaults,
  turnNum: 5,
  lastCommitment: {
    commitment: testScenarios.ledgerCommitments.preFundCommitment0,
    signature: '0x0',
  },
  penultimateCommitment: {
    commitment: testScenarios.ledgerCommitments.preFundCommitment1,
    signature: '0x0',
  },
  funded: false,
  address: testScenarios.ledgerChannel.participants[0],
  channelNonce: testScenarios.ledgerChannel.nonce,
  libraryAddress: testScenarios.ledgerChannel.channelType,
  participants: testScenarios.ledgerChannel.participants as [string, string],
};

const defaultAppChannelState = channelStates.waitForFundingAndPostFundSetup({
  ...defaults,
  turnNum: 5,
  lastCommitment: {
    commitment: testScenarios.preFundCommitment1,
    signature: '0x0',
  },
  penultimateCommitment: {
    commitment: testScenarios.preFundCommitment2,
    signature: '0x0',
  },
  funded: false,
  address: defaults.participants[0],
});

const startingState = (
  protocolState: states.PlayerAState,
  ...channelStatuses: channelStates.ChannelStatus[]
): ProtocolStateWithSharedData<states.PlayerAState> => {
  const channelState = { ...channelStates.EMPTY_CHANNEL_STATE };
  for (const channelStatus of channelStatuses) {
    channelState.initializedChannels[channelStatus.channelId] = channelStatus;
  }
  return {
    protocolState,
    sharedData: {
      outboxState: EMPTY_OUTBOX_STATE,
      channelState,
    },
  };
};

const validateMock = jest.fn().mockReturnValue(true);
Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

describe(startingIn(states.WAIT_FOR_APPROVAL), () => {
  const { channelId } = defaults;
  const state = startingState(states.waitForApproval({ channelId }), defaultAppChannelState);

  describe(whenActionArrives(actions.indirectFunding.playerA.STRATEGY_APPROVED), () => {
    const action = actions.indirectFunding.playerA.strategyApproved(
      channelId,
      ledgerChannelDefaults.libraryAddress,
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
  const { channelId, ledgerId } = defaults; // Add the ledger channel to state
  const ledgerChannelState = channelStates.waitForPreFundSetup({
    ...ledgerChannelDefaults,
    channelId: ledgerId,
  });
  const state = startingState(
    states.waitForPreFundSetup1({ channelId, ledgerId }),
    ledgerChannelState,
    defaultAppChannelState,
  );

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

describe(startingIn(states.WAIT_FOR_DIRECT_FUNDING), () => {
  const { channelId, ledgerId, directFundingState } = defaults;
  const ledgerChannelState = channelStates.waitForFundingAndPostFundSetup({
    ...ledgerChannelDefaults,
    channelId: ledgerId,
  });
  const total = testScenarios.twoThree.reduce(addHex);

  const state = startingState(
    states.waitForDirectFunding({ channelId, ledgerId, directFundingState }),
    ledgerChannelState,
  );
  // Add the ledger channel to state

  describe(whenActionArrives(actions.FUNDING_RECEIVED_EVENT), () => {
    const action = actions.fundingReceivedEvent('processId', defaults.ledgerId, total, total);
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
  const { channelId, ledgerId } = defaults;

  // Add the ledger channel to state
  const ledgerChannelState = channelStates.aWaitForPostFundSetup({
    ...ledgerChannelDefaults,
    turnNum: 2,
    channelId: ledgerId,
  });
  const state = startingState(
    states.waitForPostFundSetup1({ channelId, ledgerId }),
    ledgerChannelState,
  );
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
  const { channelId, ledgerId } = defaults;
  // Add the ledger channel to state
  const ledgerChannelState = channelStates.waitForUpdate({
    ...ledgerChannelDefaults,
    turnNum: testScenarios.ledgerCommitments.postFundCommitment1.turnNum,
    channelId: ledgerId,
  });
  const state = startingState(
    states.waitForLedgerUpdate1({ channelId, ledgerId }),
    ledgerChannelState,
  );
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
