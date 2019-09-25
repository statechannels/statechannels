import * as scenarios from './scenarios';
import { describeScenarioStep, itSendsThisDisplayEventType } from '../../../__tests__/helpers';
import { closeLedgerChannelReducer, initialize } from '../reducer';
import { HIDE_WALLET } from '../../../../magmo-wallet-client';
import * as states from '../states';

const itTransitionsTo = (
  result: { protocolState: states.CloseLedgerChannelState },
  type: states.CloseLedgerChannelStateType,
) => {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
};

describe('happy path', () => {
  const scenario = scenarios.happyPath;

  describe('when initializing', () => {
    const { processId, channelId, sharedData } = scenario.initialize;
    const result = initialize(processId, channelId, sharedData);
    itTransitionsTo(result, 'CloseLedgerChannel.WaitForConclude');
  });
  describeScenarioStep(scenario.waitForConclude, () => {
    const { state, action, sharedData } = scenario.waitForConclude;
    const result = closeLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(result, 'CloseLedgerChannel.WaitForWithdrawal');
  });

  describeScenarioStep(scenario.waitForWithdrawal, () => {
    const { state, action, sharedData } = scenario.waitForWithdrawal;
    const result = closeLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(result, 'CloseLedgerChannel.Success');
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('channel already concluded', () => {
  const scenario = scenarios.alreadyConcluded;

  describe('when initializing', () => {
    const { processId, channelId, sharedData } = scenario.initialize;
    const result = initialize(processId, channelId, sharedData);
    itTransitionsTo(result, 'CloseLedgerChannel.WaitForWithdrawal');
  });
  describeScenarioStep(scenario.waitForWithdrawal, () => {
    const { state, action, sharedData } = scenario.waitForWithdrawal;
    const result = closeLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(result, 'CloseLedgerChannel.Success');
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('channel in use failure', () => {
  const scenario = scenarios.channelInUseFailure;

  describe('when initializing', () => {
    const { processId, channelId, sharedData } = scenario.initialize;
    const result = initialize(processId, channelId, sharedData);
    itTransitionsTo(result, 'CloseLedgerChannel.Failure');
  });
});
