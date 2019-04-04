import { walletReducer } from '../reducer';

import * as states from './../state';
import * as actions from './../actions';

const defaults = {
  ...states.emptyState,
  uid: 'uid',
  adjudicator: 'adjudicator',
  networkId: 1,
};

const initializedState = states.initialized({ ...defaults });

describe('when the player initializes a channel', () => {
  const action = actions.channel.channelInitialized();
  const updatedState = walletReducer(initializedState, action);

  it('applies the channel reducer', async () => {
    const ids = Object.keys(updatedState.channelState.initializingChannels);
    expect(ids.length).toEqual(1);
    expect(updatedState.channelState.initializingChannels[ids[0]].privateKey).toEqual(
      expect.any(String),
    );
  });
});
