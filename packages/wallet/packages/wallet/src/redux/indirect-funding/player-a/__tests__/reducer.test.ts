import * as states from '../state';
import * as actions from '../../../actions';
import { playerAReducer } from '../reducer';
import * as walletStates from '../../../state';
import * as channelStates from '../../../channel-state/state';
import { PlayerIndex } from 'magmo-wallet-client/lib/wallet-instructions';
import {
  itTransitionsProcedureToStateType,
  itSendsThisMessage,
  itTransitionsToChannelStateType,
} from '../../../__tests__/helpers';
import { MESSAGE_RELAY_REQUESTED } from 'magmo-wallet-client';
import { WalletProcedure } from '../../../types';
import * as selectors from '../../../selectors';
import * as SigningUtil from '../../../../utils/signing-utils';
import {} from '../../../__tests__/test-scenarios';
import * as testScenarios from '../../../__tests__/test-scenarios';
import * as fundingStates from '../../../direct-funding-store/direct-funding-state/state';
import { addHex } from '../../../../utils/hex-utils';

const startingIn = stage => `start in ${stage}`;
const whenActionArrives = action => `incoming action ${action}`;

function itTransitionToStateType(state, type) {
  itTransitionsProcedureToStateType('indirectFunding', state, type);
}
function itTransitionsChannelToStateType(state: walletStates.Initialized, channelId: string, type) {
  const channelState = state.channelState.initializedChannels[channelId];
  itTransitionsToChannelStateType(type, { state: channelState });
}
function itTransitionsFundingToType(state: walletStates.Initialized, channelId: string, type) {
  it(`updates the direct funding status of channel ${channelId} to ${type} `, () => {
    const directFundingState = selectors.getDirectFundingState(state, channelId);
    expect(directFundingState.channelFundingStatus).toEqual(type);
  });
}

const defaults = {
  ...testScenarios,
  ourIndex: PlayerIndex.A,
  privateKey: testScenarios.asPrivateKey,
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
const defaultChannelState: channelStates.ChannelState = {
  initializedChannels: {
    [defaultAppChannelState.channelId]: defaultAppChannelState,
  },
  initializingChannels: {},
};

const defaultWalletState = walletStates.initialized({
  ...testScenarios.initializedState,
  consensusLibrary: testScenarios.ledgerLibraryAddress,
  channelState: defaultChannelState,
  fundingState: { directFunding: {}, indirectFunding: {} },
  outboxState: { displayOutbox: [], messageOutbox: [], transactionOutbox: [] },
  directFundingStore: {},
});

const validateMock = jest.fn().mockReturnValue(true);
Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

describe(startingIn(states.WAIT_FOR_APPROVAL), () => {
  const { channelId } = defaults;
  const walletState = { ...defaultWalletState };
  walletState.indirectFunding = states.waitForApproval({ channelId });

  describe(whenActionArrives(actions.indirectFunding.playerA.STRATEGY_APPROVED), () => {
    const action = actions.indirectFunding.playerA.strategyApproved(channelId);
    const updatedState = playerAReducer(walletState, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_PRE_FUND_SETUP_1);
    itSendsThisMessage(updatedState, MESSAGE_RELAY_REQUESTED);
    const newLedgerId = (updatedState.indirectFunding as states.WaitForPreFundSetup1).ledgerId;
    itTransitionsChannelToStateType(
      updatedState,
      newLedgerId,
      channelStates.WAIT_FOR_PRE_FUND_SETUP,
    );
  });
});

describe(startingIn(states.WAIT_FOR_PRE_FUND_SETUP_1), () => {
  const { channelId, ledgerId } = defaults;
  const walletState = { ...defaultWalletState };
  walletState.indirectFunding = states.waitForPreFundSetup1({ channelId, ledgerId });
  // Add the ledger channel to state
  const ledgerChannelState = channelStates.waitForPreFundSetup({
    ...ledgerChannelDefaults,
    channelId: ledgerId,
  });
  walletState.channelState.initializedChannels[ledgerId] = ledgerChannelState;

  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const action = actions.commitmentReceived(
      ledgerId,
      WalletProcedure.IndirectFunding,
      testScenarios.ledgerCommitments.preFundCommitment1,
      '0x0',
    );
    const updatedState = playerAReducer(walletState, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_DIRECT_FUNDING);
    itTransitionsChannelToStateType(
      updatedState,
      ledgerId,

      channelStates.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP,
    );
    itTransitionsFundingToType(updatedState, ledgerId, fundingStates.SAFE_TO_DEPOSIT);
  });
});

describe(startingIn(states.WAIT_FOR_DIRECT_FUNDING), () => {
  const { channelId, ledgerId } = defaults;
  const walletState = { ...defaultWalletState };

  walletState.indirectFunding = states.waitForDirectFunding({ channelId, ledgerId });
  // Add the ledger channel to state
  const ledgerChannelState = channelStates.waitForFundingAndPostFundSetup({
    ...ledgerChannelDefaults,
    channelId: ledgerId,
  });
  walletState.channelState.initializedChannels[ledgerId] = ledgerChannelState;
  const total = testScenarios.twoThree.reduce(addHex);
  walletState.directFundingStore[ledgerId] = fundingStates.waitForFundingConfirmed({
    safeToDepositLevel: '0x0',
    channelFundingStatus: fundingStates.SAFE_TO_DEPOSIT,
    requestedTotalFunds: total,
    requestedYourContribution: testScenarios.twoThree[0],
    channelId: ledgerId,
    ourIndex: PlayerIndex.A,
  });
  describe(whenActionArrives(actions.FUNDING_RECEIVED_EVENT), () => {
    const action = actions.fundingReceivedEvent(channelId, defaults.ledgerId, total, total);
    const updatedState = playerAReducer(walletState, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_POST_FUND_SETUP_1);
    itTransitionsChannelToStateType(
      updatedState,
      ledgerId,

      channelStates.A_WAIT_FOR_POST_FUND_SETUP,
    );
    itTransitionsFundingToType(updatedState, ledgerId, fundingStates.CHANNEL_FUNDED);
  });
});

describe(startingIn(states.WAIT_FOR_POST_FUND_SETUP_1), () => {
  const { channelId, ledgerId } = defaults;
  const walletState = { ...defaultWalletState };

  walletState.indirectFunding = states.waitForPostFundSetup1({ channelId, ledgerId });
  // Add the ledger channel to state
  const ledgerChannelState = channelStates.aWaitForPostFundSetup({
    ...ledgerChannelDefaults,
    turnNum: 2,
    channelId: ledgerId,
  });
  walletState.channelState.initializedChannels[ledgerId] = ledgerChannelState;
  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const action = actions.commitmentReceived(
      ledgerId,
      WalletProcedure.IndirectFunding,
      testScenarios.ledgerCommitments.postFundCommitment1,
      '0x0',
    );
    const updatedState = playerAReducer(walletState, action);
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
  const walletState = { ...defaultWalletState };

  walletState.indirectFunding = states.waitForLedgerUpdate1({ channelId, ledgerId });
  // Add the ledger channel to state
  const ledgerChannelState = channelStates.waitForUpdate({
    ...ledgerChannelDefaults,
    turnNum: testScenarios.ledgerCommitments.postFundCommitment1.turnNum,
    channelId: ledgerId,
  });
  walletState.channelState.initializedChannels[ledgerId] = ledgerChannelState;
  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const action = actions.commitmentReceived(
      ledgerId,
      WalletProcedure.IndirectFunding,
      testScenarios.ledgerCommitments.ledgerUpdate1,
      '0x0',
    );
    playerAReducer(walletState, action);
    // TODO: We need a "finished" state to test against
  });
});
