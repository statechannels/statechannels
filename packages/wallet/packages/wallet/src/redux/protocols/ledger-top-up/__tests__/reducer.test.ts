import * as scenarios from './scenarios';
import { initialize, ledgerTopUpReducer } from '../reducer';
import { LedgerTopUpState, LedgerTopUpStateType } from '../states';
import { ProtocolStateWithSharedData } from '../..';

describe('player A both players need a top up', () => {
  const scenario = scenarios.playerABothPlayersTopUp;
  describe('when initializing', () => {
    const {
      channelId,
      sharedData,
      processId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
    } = scenario.initialize;
    const initialState = initialize(
      processId,
      channelId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      sharedData,
    );

    itTransitionsTo(initialState, 'LedgerTopUp.WaitForPreTopUpLedgerUpdate');
  });
  describe('when in WaitForPreTopUpLedgerUpdate', () => {
    const { action, sharedData, state } = scenario.waitForPreTopUpLedgerUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'LedgerTopUp.WaitForDirectFunding');
  });
  describe('when in WaitForDirectFunding', () => {
    const { action, sharedData, state } = scenario.waitForDirectFunding;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'LedgerTopUp.WaitForPostTopUpLedgerUpdate');
  });
  describe('when in WaitForPostTopUpLedgerUpdate', () => {
    const { action, sharedData, state } = scenario.waitForPostTopUpLedgerUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'LedgerTopUp.Success');
  });
});

describe('player B both players need a top up', () => {
  const scenario = scenarios.playerBBothPlayersTopUp;
  describe('when initializing', () => {
    const {
      channelId,
      sharedData,
      processId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
    } = scenario.initialize;
    const initialState = initialize(
      processId,
      channelId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      sharedData,
    );

    itTransitionsTo(initialState, 'LedgerTopUp.WaitForPreTopUpLedgerUpdate');
  });
  describe('when in WaitForPreTopUpLedgerUpdate', () => {
    const { action, sharedData, state } = scenario.waitForPreTopUpLedgerUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'LedgerTopUp.WaitForDirectFunding');
  });
  describe('when in WaitForDirectFunding', () => {
    const { action, sharedData, state } = scenario.waitForDirectFunding;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'LedgerTopUp.WaitForPostTopUpLedgerUpdate');
  });
  describe('when in WaitForPostTopUpLedgerUpdate', () => {
    const { action, sharedData, state } = scenario.waitForPostTopUpLedgerUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'LedgerTopUp.Success');
  });
});

type ReturnVal = ProtocolStateWithSharedData<LedgerTopUpState>;

function itTransitionsTo(state: ReturnVal, type: LedgerTopUpStateType) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}
