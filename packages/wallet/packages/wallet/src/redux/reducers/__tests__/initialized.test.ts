import { initializedReducer } from '../initialized';

import * as states from '../../states';
import * as actions from '../../actions';
import * as outgoing from 'magmo-wallet-client/lib/wallet-events';
import * as channelStates from '../../states/channels';
import { INITIALIZING_CHANNEL, CHANNEL_INITIALIZED, channelInitialized } from '../../states';
import * as scenarios from './test-scenarios';
import { bigNumberify } from 'ethers/utils';
import { itSendsThisMessage } from './helpers';
import { waitForUpdate } from '../../states/channels';

const defaults = {
  uid: 'uid',
  adjudicator: 'adjudicator',
  networkId: 1,
  outboxState: {},
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
    requestedTotalFunds: bigNumberify(1000000000000000).toHexString(),
    requestedYourDeposit: bigNumberify(500000000000000).toHexString(),
  };

  const bParams = { address: bsAddress, ourIndex: 1, privateKey: bsPrivateKey };
  const bDefaults = { ...params, ...bParams };

  const state = channelInitialized({
    ...params,
    channelState: waitForUpdate(bDefaults),
    outboxState: {},
  });

  const action = actions.challengeRequested();
  const updatedState = initializedReducer(state, action);

  expect(state.outboxState).toEqual({});
  itSendsThisMessage(updatedState, outgoing.CHALLENGE_REJECTED);
});
