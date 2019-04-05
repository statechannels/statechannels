import * as actions from '../../actions';

import * as scenarios from '../../__tests__/test-scenarios';
import * as channelState from '../reducer';
import * as states from '../state';

const {
  initializingChannelState: initializingChannels,
  initializedChannelState: initializedChannels,
  channelId,
  asAddress,
  asPrivateKey,
  preFundCommitment1,
  preFundCommitment2,
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
      const action = actions.channel.concludedEvent(channelId);
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
    it('delegates to the single channel reducer when activeAppChannelId is defined', async () => {
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
