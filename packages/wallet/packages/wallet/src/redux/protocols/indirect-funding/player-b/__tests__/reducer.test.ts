import * as states from '../state';
import * as channelStates from '../../../../channel-state/state';
import * as actions from '../../../../actions';

import * as scenarios from '../../../../__tests__/test-scenarios';
import { playerBReducer } from '../reducer';
import {
  itSendsNoMessage,
  itSendsNoTransaction,
  itSendsThisMessage,
  expectThisCommitmentSent,
  itTransitionsToChannelStateType,
} from '../../../../__tests__/helpers';
import { WalletProtocol } from '../../../../types';
import { PlayerIndex } from 'magmo-wallet-client/lib/wallet-instructions';

import * as SigningUtil from '../../../../../utils/signing-utils';
import { ProtocolStateWithSharedData } from '../../../../protocols';
import { EMPTY_OUTBOX_STATE } from '../../../../outbox/state';
const validCommitmentSignature = jest.fn().mockReturnValue(true);
Object.defineProperty(SigningUtil, 'validCommitmentSignature', {
  value: validCommitmentSignature,
});

const startingIn = type => `starting in ${type}`;
const whenActionArrives = type => `when ${type} arrives`;

function itTransitionToStateType(state, type) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}

function itTransitionsChannelToStateType(
  state: ProtocolStateWithSharedData<states.PlayerBState>,
  channelIdToCheck: string,
  type,
) {
  const channelState = state.sharedData.channelState.initializedChannels[channelIdToCheck];
  itTransitionsToChannelStateType(type, { state: channelState });
}

const {
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

const startingState = (
  protocolState: states.PlayerBState,
  ...channelStatuses: channelStates.ChannelStatus[]
): ProtocolStateWithSharedData<states.PlayerBState> => {
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

describe(startingIn(states.WAIT_FOR_APPROVAL), () => {
  describe(whenActionArrives(actions.indirectFunding.playerB.STRATEGY_PROPOSED), () => {
    const state = startingState(states.waitForApproval({ channelId }));
    const action = actions.indirectFunding.playerB.strategyProposed(channelId);
    const updatedState = playerBReducer(state.protocolState, state.sharedData, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_PRE_FUND_SETUP_0);
  });
});

describe(startingIn(states.WAIT_FOR_PRE_FUND_SETUP_0), () => {
  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const state = startingState(
      states.waitForPreFundSetup0({ channelId }),
      channelStates.waitForFundingAndPostFundSetup(appChannelStateDefaults),
    );

    const action = actions.commitmentReceived(
      channelId,
      WalletProtocol.IndirectFunding,
      preFundCommitment0,
      'signature',
    );
    const updatedState = playerBReducer(state.protocolState, state.sharedData, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_DIRECT_FUNDING);
    itSendsNoMessage(updatedState.sharedData);
    itSendsNoTransaction(updatedState.sharedData);
  });
});

describe(startingIn(states.WAIT_FOR_DIRECT_FUNDING), () => {
  describe.skip(whenActionArrives(actions.FUNDING_RECEIVED_EVENT), () => {
    // Need to hook up the direct funding store first, which isn't yet in this branch
    const state = startingState(
      states.waitForDirectFunding({ channelId, ledgerId }),
      channelStates.waitForFundingAndPostFundSetup(appChannelStateDefaults),
    );

    const action = actions.commitmentReceived(
      channelId,
      WalletProtocol.IndirectFunding,
      preFundCommitment0,
      'signature',
    );
    // TODO: This should fail, since we're not mocking the signature...
    const updatedState = playerBReducer(state.protocolState, state.sharedData, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_LEDGER_UPDATE_0);
    itSendsThisMessage(updatedState.sharedData, { foo: 'foo' });
    itSendsNoTransaction(updatedState.sharedData);
  });
});

describe(startingIn(states.WAIT_FOR_POST_FUND_SETUP_0), () => {
  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const state = startingState(
      states.waitForPostFundSetup0({ channelId, ledgerId }),
      channelStates.waitForFundingAndPostFundSetup(appChannelStateDefaults),
      channelStates.bWaitForPostFundSetup({
        ...ledgerChannelStateDefaults,
        lastCommitment: {
          commitment: ledgerCommitments.preFundCommitment1,
          signature: MOCK_SIGNATURE,
        },
      }),
    );

    const action = actions.commitmentReceived(
      channelId,
      WalletProtocol.IndirectFunding,
      postFundCommitment0,
      'signature',
    );
    const updatedState = playerBReducer(state.protocolState, state.sharedData, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_LEDGER_UPDATE_0);
    expectThisCommitmentSent(updatedState.sharedData, ledgerCommitments.postFundCommitment1);
    itSendsNoTransaction(updatedState.sharedData);
  });
});

describe(startingIn(states.WAIT_FOR_LEDGER_UPDATE_0), () => {
  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const state = startingState(
      states.waitForLedgerUpdate0({ channelId, ledgerId }),
      channelStates.waitForFundingAndPostFundSetup(appChannelStateDefaults),
      channelStates.waitForUpdate({
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
    );

    const action = actions.commitmentReceived(
      channelId,
      WalletProtocol.IndirectFunding,
      ledgerCommitments.ledgerUpdate0,
      'signature',
    );
    const updatedState = playerBReducer(state.protocolState, state.sharedData, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_CONSENSUS);
    expectThisCommitmentSent(updatedState.sharedData, ledgerCommitments.ledgerUpdate1);
    itSendsNoTransaction(updatedState.sharedData);
    itTransitionsChannelToStateType(
      updatedState,
      channelId,
      channelStates.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP,
    );
  });
});

describe(startingIn(states.WAIT_FOR_CONSENSUS), () => {
  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const state = startingState(
      states.waitForConsensus({ channelId, ledgerId }),
      channelStates.waitForFundingAndPostFundSetup(appChannelStateDefaults),
      channelStates.waitForUpdate({
        ...ledgerChannelStateDefaults,
        lastCommitment: {
          commitment: ledgerCommitments.ledgerUpdate1,
          signature: MOCK_SIGNATURE,
        },
        turnNum: 5,
      }),
    );

    const action = actions.commitmentReceived(
      channelId,
      WalletProtocol.IndirectFunding,
      ledgerCommitments.ledgerUpdate2,
      'signature',
    );
    const updatedState = playerBReducer(state.protocolState, state.sharedData, action);

    itTransitionToStateType(updatedState, states.WAIT_FOR_CONSENSUS);
    // itSendsNoCommitment(updatedState);
    itSendsNoTransaction(updatedState.sharedData);
    itTransitionsChannelToStateType(
      updatedState,
      channelId,
      channelStates.B_WAIT_FOR_POST_FUND_SETUP,
    );
  });
});
