import * as actions from '../../actions';

import * as scenarios from '../../__tests__/test-scenarios';
import * as channelState from '../reducer';
import * as states from '../state';
import { itTransitionsToChannelStateType, itSendsThisMessage } from '../../__tests__/helpers';
import * as SigningUtil from '../../../domain';
import { validationFailure, SIGNATURE_FAILURE } from 'magmo-wallet-client';
import { fundingConfirmed } from '../../internal/actions';

const {
  initializingChannelState: initializingChannels,
  initializedChannelState: initializedChannels,
  channelId,
  asAddress,
  asPrivateKey,
  bsAddress,
  bsPrivateKey,
  preFundCommitment0: preFundCommitment1,
  preFundCommitment1: preFundCommitment2,
} = scenarios;

const defaults = {
  initializedChannels: {},
  initializingChannels: {},
};

describe('when CHANNEL_INITIALIZED arrives', () => {
  it('updates state.channelState.initializingChannels', async () => {
    const state = defaults;
    const action = actions.channel.channelInitialized();

    const updatedState = channelState.channelStateReducer(state, action);

    const signingAddrs = Object.keys(updatedState.state.initializingChannels);
    expect(signingAddrs.length).toEqual(1);

    const addr = signingAddrs[0];
    expect(updatedState.state.initializingChannels[addr]).toMatchObject({
      privateKey: expect.any(String),
    });
  });
});

describe('when the channel is part of the initializedChannelState', () => {
  describe('when the first commitment arrives', () => {
    it('moves the channel from initializingChannels to initializedChannels', () => {
      const state = { ...defaults, initializingChannels };
      const action = actions.channel.ownCommitmentReceived(preFundCommitment1);

      const updatedState = channelState.channelStateReducer(state, action);

      const signingAddrs = Object.keys(updatedState.state.initializingChannels);
      expect(signingAddrs.length).toEqual(0);

      expect(updatedState.state.initializedChannels).toMatchObject({
        [channelId]: {
          type: states.WAIT_FOR_PRE_FUND_SETUP,
          privateKey: asPrivateKey,
          address: asAddress,
          lastCommitment: { commitment: preFundCommitment1 },
        },
      });
    });
  });
});

describe('when the channel is part of the channelState', () => {
  describe('when a channel action with a channelId arrives', () => {
    it('delegates to the single channel reducer', async () => {
      const state = { ...defaults, initializedChannels };
      const action = fundingConfirmed(channelId);
      const mock = jest.fn().mockReturnValue({ state });
      Object.defineProperty(channelState, 'initializedChannelStatusReducer', { value: mock });
      channelState.channelStateReducer(state, action);
      expect(mock).toHaveBeenCalledWith(state.initializedChannels[channelId], action);
    });
  });

  describe('when a channel action with a commitment arrives', () => {
    it('delegates to the single channel reducer', async () => {
      const state = { ...defaults, initializedChannels };
      const action = actions.channel.ownCommitmentReceived(preFundCommitment2);
      const mock = jest.fn().mockReturnValue({ state });
      Object.defineProperty(channelState, 'initializedChannelStatusReducer', { value: mock });
      channelState.channelStateReducer(state, action);
      expect(mock).toHaveBeenCalledWith(state.initializedChannels[channelId], action);
    });
  });

  describe('when a channel action with no channelId/commitment arrives', () => {
    it.skip('delegates to the single channel reducer when activeAppChannelId is defined', async () => {
      const state = { ...defaults, initializedChannels, activeAppChannelId: channelId };
      const action = actions.channel.challengeRequested();
      const mock = jest.fn().mockReturnValue({ state });
      Object.defineProperty(channelState, 'initializedChannelStatusReducer', { value: mock });
      channelState.channelStateReducer(state, action);
      expect(mock).toHaveBeenCalledWith(state.initializedChannels[channelId], action);
    });

    it('ignores an action when activeAppChannelId is not defined', async () => {
      const state = { ...defaults, initializedChannels };
      const action = actions.channel.challengeRequested();
      const mock = jest.fn().mockReturnValue({ state });
      Object.defineProperty(channelState, 'initializedChannelStatusReducer', { value: mock });
      channelState.channelStateReducer(state, action);
      expect(mock).toBeCalledTimes(0);
    });
  });
});

describe('when the channel is initializing', () => {
  describe('when we send in a PreFundSetupA', () => {
    // preFundSetupA is A's move, so in this case we need to be player A
    const initializingChannelsA = {
      [asAddress]: { address: asAddress, privateKey: asPrivateKey },
    };
    const state = { ...defaults, initializingChannels: initializingChannelsA };
    const action = actions.channel.ownCommitmentReceived(preFundCommitment1);

    const updatedState = channelState.channelStateReducer(state, action);
    const initializedChannel = { state: states.getChannel(updatedState.state, channelId) };

    itTransitionsToChannelStateType(states.WAIT_FOR_PRE_FUND_SETUP, initializedChannel);
  });

  describe('when an opponent sends a PreFundSetupA', () => {
    // preFundSetupA is A's move, so in this case we need to be player B
    const initializingChannelsB = {
      [bsAddress]: { address: bsAddress, privateKey: bsPrivateKey },
    };
    const state = { ...defaults, initializingChannels: initializingChannelsB };
    const action = actions.channel.opponentCommitmentReceived(preFundCommitment1, 'sig');
    const validateMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

    const updatedState = channelState.channelStateReducer(state, action);
    const initializedChannel = { state: states.getChannel(updatedState.state, channelId) };

    itTransitionsToChannelStateType(states.WAIT_FOR_PRE_FUND_SETUP, initializedChannel);
  });

  describe('when an opponent sends a PreFundSetupA but the signature is bad', () => {
    const initializingChannelsA = {
      [asAddress]: { address: asAddress, privateKey: asPrivateKey },
    };
    const state = { ...defaults, initializingChannels: initializingChannelsA };
    const action = actions.channel.opponentCommitmentReceived(
      preFundCommitment1,
      'not-a-signature',
    );
    const validateMock = jest.fn().mockReturnValue(false);
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

    const updatedState = channelState.channelStateReducer(state, action);
    const initializedChannel = states.getChannel(updatedState.state, channelId);

    expect(initializedChannel).toBeUndefined(); // it doesn't transition

    itSendsThisMessage(updatedState, validationFailure('InvalidSignature'));
  });

  describe('when we send in a a non-PreFundSetupA', () => {
    const initializingChannelsA = {
      [asAddress]: { address: asAddress, privateKey: asPrivateKey },
    };
    const state = { ...defaults, initializingChannels: initializingChannelsA };
    const action = actions.channel.ownCommitmentReceived(preFundCommitment2);
    const updatedState = channelState.channelStateReducer(state, action);
    const initializedChannel = states.getChannel(updatedState.state, channelId);

    expect(initializedChannel).toBeUndefined(); // it doesn't transition
    // TODO:
    // this doesn't happen. The problem is that we don't hit `handleFirstCommit`
    itSendsThisMessage(updatedState, SIGNATURE_FAILURE);
  });
});
