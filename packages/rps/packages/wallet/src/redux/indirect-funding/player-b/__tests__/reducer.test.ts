import * as states from '../state';
import * as walletStates from '../../../state';
import * as channelStates from '../../../channel-state/state';
import * as actions from '../../../actions';

import * as scenarios from '../../../__tests__/test-scenarios';
import { playerBReducer } from '../reducer';
import {
  itTransitionsProcedureToStateType,
  itSendsNoMessage,
  itSendsNoTransaction,
  itSendsThisMessage,
  expectThisCommitmentSent,
} from '../../../__tests__/helpers';
import { WalletProcedure } from '../../../types';
import { PlayerIndex } from 'magmo-wallet-client/lib/wallet-instructions';

import * as SigningUtil from '../../../../utils/signing-utils';
const validCommitmentSignature = jest.fn().mockReturnValue(true);
Object.defineProperty(SigningUtil, 'validCommitmentSignature', {
  value: validCommitmentSignature,
});

const startingIn = type => `starting in ${type}`;
const whenActionArrives = type => `when ${type} arrives`;

function itTransitionToStateType(state, type) {
  itTransitionsProcedureToStateType('indirectFunding', state, type);
}

const {
  initializedState,
  ledgerCommitments,
  bsAddress,
  bsPrivateKey,
  channelNonce,
  libraryAddress,
  ledgerLibraryAddress,
  participants,
  preFundCommitment1,
  preFundCommitment2,
  channelId,
  ledgerId,
  ledgerChannel,
} = scenarios;

const { preFundCommitment0, postFundCommitment0 } = ledgerCommitments;

const MOCK_SIGNATURE = 'signature';
const appChannelStateDefaults = {
  address: bsAddress,
  privateKey: bsPrivateKey,
  adjudicator: 'adj-address',
  channelId,
  channelNonce,
  libraryAddress,
  networkId: 3,
  participants,
  uid: 'uid',
  transactionHash: '0x0',
  funded: false,
  penultimateCommitment: { commitment: preFundCommitment1, signature: MOCK_SIGNATURE },
  lastCommitment: { commitment: preFundCommitment2, signature: MOCK_SIGNATURE },
  turnNum: 1,
  ourIndex: PlayerIndex.B,
};

const ledgerChannelStateDefaults = {
  address: bsAddress,
  privateKey: bsPrivateKey,
  adjudicator: 'adj-address',
  channelId: ledgerId,
  channelNonce: ledgerChannel.nonce,
  libraryAddress: ledgerLibraryAddress,
  networkId: 3,
  participants: ledgerChannel.participants as [string, string],
  uid: 'uid',
  transactionHash: '0x0',
  funded: false,
  penultimateCommitment: {
    commitment: ledgerCommitments.preFundCommitment0,
    signature: MOCK_SIGNATURE,
  },
  lastCommitment: { commitment: ledgerCommitments.preFundCommitment1, signature: MOCK_SIGNATURE },
  turnNum: 1,
  ourIndex: PlayerIndex.B,
};

const defaultState = { ...initializedState };
const startingState = (
  state: states.PlayerBState,
  channelState?: { [channelId: string]: channelStates.OpenedState },
): walletStates.IndirectFundingOngoing => ({
  ...defaultState,
  indirectFunding: state,
  channelState: {
    ...channelStates.EMPTY_CHANNEL_STATE,
    initializedChannels: channelState || {},
  },
});

describe(startingIn(states.WAIT_FOR_APPROVAL), () => {
  describe(whenActionArrives(actions.indirectFunding.playerB.STRATEGY_PROPOSED), () => {
    const state = startingState(states.waitForApproval({ channelId }));
    const action = actions.indirectFunding.playerB.strategyProposed(channelId);
    const updatedState = playerBReducer(state, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_PRE_FUND_SETUP_0);
  });
});

describe(startingIn(states.WAIT_FOR_PRE_FUND_SETUP_0), () => {
  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const state = startingState(states.waitForPreFundSetup0({ channelId }), {
      [channelId]: channelStates.waitForFundingAndPostFundSetup(appChannelStateDefaults),
    });

    const action = actions.commitmentReceived(
      channelId,
      WalletProcedure.IndirectFunding,
      preFundCommitment0,
      'signature',
    );
    const updatedState = playerBReducer(state, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_DIRECT_FUNDING);
    itSendsNoMessage(updatedState);
    itSendsNoTransaction(updatedState);
  });
});

describe(startingIn(states.WAIT_FOR_DIRECT_FUNDING), () => {
  describe.skip(whenActionArrives(actions.funding.FUNDING_RECEIVED_EVENT), () => {
    // Need to hook up the direct funding store first, which isn't yet in this branch
    const state = startingState(states.waitForDirectFunding({ channelId, ledgerId }), {
      [channelId]: channelStates.waitForFundingAndPostFundSetup(appChannelStateDefaults),
    });

    const action = actions.commitmentReceived(
      channelId,
      WalletProcedure.IndirectFunding,
      preFundCommitment0,
      'signature',
    );
    // TODO: This should fail, since we're not mocking the signature...
    const updatedState = playerBReducer(state, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_LEDGER_UPDATE_0);
    itSendsThisMessage(updatedState, { foo: 'foo' });
    itSendsNoTransaction(updatedState);
  });
});

describe(startingIn(states.WAIT_FOR_POST_FUND_SETUP_0), () => {
  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const state = startingState(states.waitForPostFundSetup0({ channelId, ledgerId }), {
      [channelId]: channelStates.waitForFundingAndPostFundSetup(appChannelStateDefaults),
      [ledgerId]: channelStates.bWaitForPostFundSetup({
        ...ledgerChannelStateDefaults,
        lastCommitment: {
          commitment: ledgerCommitments.preFundCommitment1,
          signature: MOCK_SIGNATURE,
        },
      }),
    });

    const action = actions.commitmentReceived(
      channelId,
      WalletProcedure.IndirectFunding,
      postFundCommitment0,
      'signature',
    );
    const updatedState = playerBReducer(state, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_LEDGER_UPDATE_0);
    expectThisCommitmentSent(updatedState, ledgerCommitments.postFundCommitment1);
    itSendsNoTransaction(updatedState);
  });
});

describe(startingIn(states.WAIT_FOR_LEDGER_UPDATE_0), () => {
  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const state = startingState(states.waitForLedgerUpdate0({ channelId, ledgerId }), {
      [channelId]: channelStates.waitForFundingAndPostFundSetup(appChannelStateDefaults),
      [ledgerId]: channelStates.waitForUpdate({
        ...ledgerChannelStateDefaults,
        lastCommitment: {
          commitment: ledgerCommitments.postFundCommitment1,
          signature: MOCK_SIGNATURE,
        },
        penultimateCommitment: {
          commitment: ledgerCommitments.postFundCommitment0,
          signature: MOCK_SIGNATURE,
        },
        turnNum: 3,
      }),
    });

    const action = actions.commitmentReceived(
      channelId,
      WalletProcedure.IndirectFunding,
      ledgerCommitments.ledgerUpdate0,
      'signature',
    );
    const updatedState = playerBReducer(state, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_CONSENSUS);
    expectThisCommitmentSent(updatedState, ledgerCommitments.ledgerUpdate1);
    itSendsNoTransaction(updatedState);
    it('does not confirm funding', () => {
      expect(updatedState.channelState.initializedChannels[channelId].type).toEqual(
        channelStates.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP,
      );
    });
  });
});

describe(startingIn(states.WAIT_FOR_CONSENSUS), () => {
  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const state = startingState(states.waitForConsensus({ channelId, ledgerId }), {
      [channelId]: channelStates.waitForFundingAndPostFundSetup(appChannelStateDefaults),
      [ledgerId]: channelStates.waitForUpdate({
        ...ledgerChannelStateDefaults,
        lastCommitment: {
          commitment: ledgerCommitments.ledgerUpdate1,
          signature: MOCK_SIGNATURE,
        },
        turnNum: 5,
      }),
    });

    const action = actions.commitmentReceived(
      channelId,
      WalletProcedure.IndirectFunding,
      ledgerCommitments.ledgerUpdate2,
      'signature',
    );
    const updatedState = playerBReducer(state, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_CONSENSUS);
    // itSendsNoCommitment(updatedState);
    itSendsNoTransaction(updatedState);
    it('confirms funding', () => {
      expect(updatedState.channelState.initializedChannels[channelId].type).toEqual(
        channelStates.B_WAIT_FOR_POST_FUND_SETUP,
      );
    });
  });
});
