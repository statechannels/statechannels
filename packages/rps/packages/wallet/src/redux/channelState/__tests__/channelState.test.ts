import * as actions from '../../actions';

import * as scenarios from '../../__tests__/test-scenarios';
import { channelStateReducer } from '../reducer';
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
    const action = actions.channelInitialized();

    const updatedState = channelStateReducer(state, action);

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
      const action = actions.ownCommitmentReceived(preFundCommitment1);

      const updatedState = channelStateReducer(state, action);

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
  describe('when a channel action arrives', () => {
    it('delegates to the single channel reducer', async () => {
      const state = { ...defaults, initializedChannels };
      const action = actions.ownCommitmentReceived(preFundCommitment2);

      const updatedState = channelStateReducer(state, action);

      const signingAddrs = Object.keys(updatedState.state.initializingChannels);
      expect(signingAddrs.length).toEqual(0);

      expect(updatedState.state.initializedChannels).toMatchObject({
        [channelId]: {
          privateKey: asPrivateKey,
          address: asAddress,
          lastCommitment: { commitment: preFundCommitment1 },
        },
      });
    });
  });
});
