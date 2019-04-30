import * as states from '../states';
import { initialize, defundingReducer } from '../reducer';
import * as scenarios from './scenarios';

const itTransitionsTo = (result: { protocolState: states.DefundingState }, type: string) => {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
};

const itTransitionsToFailure = (
  result: { protocolState: states.DefundingState },
  failure: states.Failure,
) => {
  it(`transitions to failure with reason ${failure.reason}`, () => {
    expect(result.protocolState).toMatchObject(failure);
  });
};

describe('directly funded happy path', () => {
  const scenario = scenarios.directlyFundingChannelHappyPath;
  const { processId, channelId, sharedData } = scenario;

  describe('when initializing', () => {
    const result = initialize(processId, channelId, sharedData);
    itTransitionsTo(result, states.WAIT_FOR_WITHDRAWAL);
  });
  describe(`when in ${states.WAIT_FOR_WITHDRAWAL}`, () => {
    const state = scenario.waitForWithdrawal;
    const action = scenario.withdrawalSuccessAction;
    const result = defundingReducer(state, sharedData, action);

    itTransitionsTo(result, states.SUCCESS);
  });
});

describe('directly funded failure', () => {
  const scenario = scenarios.directlyFundingFailure;
  const { sharedData } = scenario;

  describe(`when in ${states.WAIT_FOR_WITHDRAWAL}`, () => {
    const state = scenario.waitForWithdrawal;
    const action = scenario.withdrawalFailureAction;
    const result = defundingReducer(state, sharedData, action);

    itTransitionsToFailure(result, scenario.failure);
  });
});

describe('channel not closed', () => {
  const scenario = scenarios.channelNotClosed;
  const { sharedData, processId, channelId } = scenario;
  describe('when initializing', () => {
    const result = initialize(processId, channelId, sharedData);

    itTransitionsToFailure(result, scenario.failure);
  });
});
// TODO: These tests rely on ledger de-funding being completed
// describe('indirectly funded happy path', () => {
//   const scenario = scenarios.indirectlyFundingChannelHappyPath;
//   const { processId, channelId, sharedData } = scenario;

//   describe('when initializing', () => {
//     const result = initialize(processId, channelId, sharedData);
//     itTransitionsTo(result, states.WAIT_FOR_LEDGER_DEFUNDING);
//   });
//   describe(`when in ${states.WAIT_FOR_LEDGER_DEFUNDING}`, () => {
//     const state = scenario.waitForLedgerDefunding;
//     const action = scenario.ledgerDefundingSuccessAction;
//     const result = defundingReducer(state, sharedData, action);

//     itTransitionsTo(result, states.SUCCESS);
//   });
// });

// describe('indirectly funded failure', () => {
//   const scenario = scenarios.indirectlyFundingFailure;
//   const { sharedData } = scenario;

//   describe(`when in ${states.WAIT_FOR_LEDGER_DEFUNDING}`, () => {
//     const state = scenario.waitForLedgerDefunding;
//     const action = scenario.ledgerDefundingFailureAction;
//     const result = defundingReducer(state, sharedData, action);

//     itTransitionsToFailure(result, scenario.failure);
//   });
// });
