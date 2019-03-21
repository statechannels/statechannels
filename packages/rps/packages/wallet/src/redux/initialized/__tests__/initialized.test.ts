import { initializedReducer } from '../reducer';

import * as states from '../../state';
import * as fundingStates from '../../fundingState/state';
import * as actions from '../../actions';
import * as outgoing from 'magmo-wallet-client/lib/wallet-events';
import * as channelStates from '../../channelState/state';
import { INITIALIZING_CHANNEL, CHANNEL_INITIALIZED, channelInitialized } from '../../state';
import * as scenarios from '../../__tests__/test-scenarios';
import { itSendsThisMessage } from '../../__tests__/helpers';
import { waitForUpdate } from '../../channelState/state';

const defaults = {
  uid: 'uid',
  adjudicator: 'adjudicator',
  networkId: 1,
  outboxState: {},
  fundingState: fundingStates.waitForFundingRequest(),
};

const { preFundCommitment1 } = scenarios;

describe('when in WAITING_FOR_CHANNEL_INITIALIZATION', () => {
  const state = states.waitingForChannelInitialization({ ...defaults });

  describe('when the player initializes a channel', () => {
    const action = actions.channelInitialized();
    const updatedState = initializedReducer(state, action);

    it('transitions to INITIALIZING_CHANNEL', async () => {
      expect(updatedState.type).toEqual(INITIALIZING_CHANNEL);
      expect((updatedState.channelState as channelStates.WaitForChannel).type).toEqual(
        channelStates.WAIT_FOR_CHANNEL,
      );
    });
  });
});

describe('when in INITIALIZING_CHANNEL', () => {
  const state = states.initializingChannel({
    ...defaults,
    channelState: { address: 'address', privateKey: 'privateKey' },
  });

  describe('when the participant sends a commitment', () => {
    const action = actions.ownCommitmentReceived(preFundCommitment1);
    const updatedState = initializedReducer(state, action);

    it('transitions to CHANNEL_INITIALIZED', async () => {
      expect(updatedState.type).toEqual(CHANNEL_INITIALIZED);
      expect((updatedState.channelState as channelStates.WaitForPreFundSetup).type).toEqual(
        channelStates.WAIT_FOR_CHANNEL,
      );
    });
  });
});

describe('When the channel reducer declares a side effect', () => {
  const {
    bsAddress,
    bsPrivateKey,
    gameCommitment1,
    gameCommitment2,
    channelNonce,
    channelId,
    channel,
    fundingState,
  } = scenarios;
  const params = {
    uid: 'uid',
    participants: channel.participants as [string, string],
    libraryAddress: channel.channelType,
    channelId,
    channelNonce,
    lastCommitment: { commitment: gameCommitment1, signature: 'sig' },
    penultimateCommitment: { commitment: gameCommitment2, signature: 'sig' },
    turnNum: gameCommitment2.turnNum,
    adjudicator: 'adj-address',
    challengeExpiry: new Date(),
    networkId: 2132,
    fundingState,
    funded: false,
  };

  const bParams = { address: bsAddress, ourIndex: 1, privateKey: bsPrivateKey };
  const bDefaults = { ...params, ...bParams };

  const state = channelInitialized({
    ...params,
    channelState: waitForUpdate(bDefaults),
    outboxState: {},
    fundingState: fundingStates.waitForFundingRequest(),
  });

  const action = actions.challengeRequested();
  const updatedState = initializedReducer(state, action);

  expect(state.outboxState).toEqual({});
  itSendsThisMessage(updatedState, outgoing.CHALLENGE_REJECTED);
});
