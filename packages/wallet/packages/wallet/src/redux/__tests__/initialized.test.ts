import { walletReducer } from '../reducer';

import * as states from './../state';
import * as actions from './../actions';
import * as scenarios from './test-scenarios';
import { PlayerIndex, WalletProtocol } from '../types';
import * as fundProtocol from '../protocols/funding';
import { fundingRequested } from '../protocols/actions';

const { channelId } = scenarios;

const defaults = {
  ...states.EMPTY_SHARED_DATA,
  uid: 'uid',
  processStore: {},
  adjudicatorStore: {},
};

const initializedState = states.initialized({ ...defaults });

describe('when a NewProcessAction arrives', () => {
  const processId = channelId;

  const action = fundingRequested(channelId, PlayerIndex.A);
  const initialize = jest.fn(() => ({
    protocolState: 'protocolState',
    sharedData: { prop: 'value' },
  }));
  Object.defineProperty(fundProtocol, 'initialize', { value: initialize });

  const updatedState = walletReducer(initializedState, action);
  it('calls initialize', () => {
    expect(initialize).toHaveBeenCalledWith(
      states.EMPTY_SHARED_DATA,
      action.channelId,
      processId,
      action.playerIndex,
    );
  });

  it('stores the process in the process store', () => {
    expect((updatedState as states.Initialized).processStore).toMatchObject({
      [processId]: { protocolState: 'protocolState' },
    });
  });
});

describe('when a ProcessAction arrives', () => {
  const processId = channelId;
  const protocolState = {};
  const processState: states.ProcessState = {
    processId,
    protocol: WalletProtocol.Funding,
    channelsToMonitor: [],
    protocolState,
  };
  const state = { ...initializedState, processStore: { [processId]: processState } };

  const action = actions.indirectFunding.playerA.strategyApproved(channelId, '0xf00');
  const indirectFundingReducer = jest.fn(() => ({
    protocolState: 'protocolState',
    sharedData: 'sharedData ',
  }));
  Object.defineProperty(fundProtocol, 'reducer', {
    value: indirectFundingReducer,
  });

  walletReducer(state, action);
  it('calls the correct reducer', () => {
    expect(indirectFundingReducer).toHaveBeenCalledWith(
      protocolState,
      states.EMPTY_SHARED_DATA,
      action,
    );
  });
});
