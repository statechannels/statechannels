import { walletReducer, getProcessId } from '../reducer';

import * as states from './../state';
import * as actions from './../actions';

import { TwoPartyPlayerIndex } from '../types';
import * as fundProtocol from '../protocols/funding';
import { fundingRequested } from '../protocols/actions';
import * as adjudicatorState from '../adjudicator-state/reducer';
import { ProcessProtocol, strategyApproved } from '../../communication';
import { channelId } from '../../domain/commitments/__tests__';
const defaults = {
  ...states.EMPTY_SHARED_DATA,
  uid: 'uid',
  processStore: {},
  adjudicatorStore: {},
  address: 'address',
  privateKey: 'privateKey',
};

const initializedState = states.initialized({ ...defaults });

describe('when a NewProcessAction arrives', () => {
  const action = fundingRequested({ channelId, playerIndex: TwoPartyPlayerIndex.A });
  const processId = getProcessId(action);
  const initialize = jest.fn(() => ({
    protocolState: 'protocolState',
    sharedData: { prop: 'value' },
  }));
  Object.defineProperty(fundProtocol, 'initializeFunding', { value: initialize });

  const updatedState = walletReducer(initializedState, action);
  it('calls initialize', () => {
    expect(initialize).toHaveBeenCalledWith(states.EMPTY_SHARED_DATA, processId, action.channelId);
  });

  it('stores the process in the process store', () => {
    expect((updatedState as states.Initialized).processStore).toMatchObject({
      [processId]: { protocolState: 'protocolState' },
    });
  });
});

describe('when a ProcessAction arrives', () => {
  const processId = '0xprocessId';
  const protocolState = {};
  const processState: states.ProcessState = {
    processId,
    protocol: ProcessProtocol.Funding,
    channelsToMonitor: [],
    protocolState,
  };
  const state = { ...initializedState, processStore: { [processId]: processState } };

  const action = strategyApproved({
    processId: '0xprocessId',
    strategy: 'IndirectFundingStrategy',
  });
  const NewLedgerChannelReducer = jest.fn(() => ({
    protocolState: { type: 'StateType' },
    sharedData: 'sharedData ',
  }));
  Object.defineProperty(fundProtocol, 'fundingReducer', {
    value: NewLedgerChannelReducer,
  });

  walletReducer(state, action);
  it('calls the correct reducer', () => {
    expect(NewLedgerChannelReducer).toHaveBeenCalledWith(
      protocolState,
      states.EMPTY_SHARED_DATA,
      action,
    );
  });
});

describe('when a updateSharedData action arrives', () => {
  const reducer = jest.fn(() => ({}));
  Object.defineProperty(adjudicatorState, 'adjudicatorStateReducer', { value: reducer });

  const action = actions.challengeExpiredEvent({
    processId: '123',
    protocolLocator: [],
    channelId: '123',
    timestamp: 1,
  });
  const state = { ...initializedState, adjudicatorState: {} };
  walletReducer(initializedState, action);

  it('passes the action to the adjudicator state reducer', () => {
    expect(reducer).toHaveBeenCalledWith(state.adjudicatorState, action);
  });
});

describe('when a process state is terminal', () => {
  const processId = '0xprocessId';
  const protocolState = {};
  const processState: states.ProcessState = {
    processId,
    protocol: ProcessProtocol.Funding,
    channelsToMonitor: [],
    protocolState,
  };
  const state = { ...initializedState, processStore: { [processId]: processState } };
  const action = strategyApproved({
    processId: '0xprocessId',
    strategy: 'IndirectFundingStrategy',
  });
  const reducer = jest.fn(() => ({
    protocolState: { type: 'Funding.Success' },
    sharedData: 'sharedData ',
  }));
  Object.defineProperty(fundProtocol, 'fundingReducer', {
    value: reducer,
  });

  const result = walletReducer(state, action);
  it('removes the current process id', () => {
    expect(result.currentProcessId).toBeUndefined();
  });
  it('removes the process state', () => {
    expect(Object.keys((result as states.Initialized).processStore)).not.toContain(processId);
  });
});
