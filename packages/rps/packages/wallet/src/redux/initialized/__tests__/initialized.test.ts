import { initializedReducer } from '../reducer';

import * as states from '../../state';
import * as fundingStates from '../../fundingState/state';
import * as actions from '../../actions';
import * as outgoing from 'magmo-wallet-client/lib/wallet-events';
import * as scenarios from '../../__tests__/test-scenarios';
import { waitForUpdate } from '../../channelState/state';
import { EMPTY_OUTBOX_STATE } from '../../outbox/state';

const { channelId } = scenarios;

const defaults = {
  ...states.emptyState,
  uid: 'uid',
  adjudicator: 'adjudicator',
  networkId: 1,
};

const initializedState = states.initialized({ ...defaults });

describe('when the player initializes a channel', () => {
  const action = actions.channelInitialized();
  const updatedState = initializedReducer(initializedState, action);

  it('applies the channel reducer', async () => {
    const ids = Object.keys(updatedState.channelState.initializingChannels);
    expect(ids.length).toEqual(1);
    expect(updatedState.channelState.initializingChannels[ids[0]].privateKey).toEqual(
      expect.any(String),
    );
  });
});

describe('when a funding related action arrives', () => {
  const action = actions.fundingReceivedEvent('0xf00', '0x', '0x');
  const updatedState = initializedReducer(initializedState, action);

  it('applies the funding state reducer', async () => {
    expect(updatedState.fundingState.channelFundingStatus).toEqual(
      fundingStates.FUNDING_NOT_STARTED,
    );
  });
});

describe('When the channel reducer declares a side effect', () => {
  const {
    bsAddress,
    bsPrivateKey,
    gameCommitment1,
    gameCommitment2,
    channelNonce,
    channel,
  } = scenarios;
  const walletParams = {
    ...states.emptyState,
    uid: 'uid',
    adjudicator: 'adj-address',
    networkId: 2132,
  };

  const channelParams = {
    participants: channel.participants as [string, string],
    libraryAddress: channel.channelType,
    channelId,
    channelNonce,
    lastCommitment: { commitment: gameCommitment1, signature: 'sig' },
    penultimateCommitment: { commitment: gameCommitment2, signature: 'sig' },
    turnNum: gameCommitment2.turnNum,
    challengeExpiry: new Date(),
    funded: false,
  };

  const bParams = { address: bsAddress, ourIndex: 1, privateKey: bsPrivateKey };
  const bDefaults = { ...channelParams, ...bParams };

  const state = states.initialized({
    ...walletParams,
    channelState: {
      initializedChannels: { [channelId]: waitForUpdate(bDefaults) },
      initializingChannels: {},
      activeAppChannelId: channelId,
    },
    outboxState: {
      ...EMPTY_OUTBOX_STATE,
      actionOutbox: [actions.internal.directFundingConfirmed('channelId')],
    },
  });

  const action = actions.challengeRequested();

  const updatedState = initializedReducer(state, action);

  expect(updatedState.outboxState.messageOutbox![0].type).toEqual(outgoing.CHALLENGE_REJECTED);
  expect(updatedState.outboxState!.actionOutbox![0].type).toEqual(
    actions.internal.DIRECT_FUNDING_CONFIRMED,
  );
});
