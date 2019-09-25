import * as scenarios from './scenarios';
import { withdrawalReducer as reducer, initialize } from '../reducer';
import * as states from '../states';
import * as TransactionGenerator from '../../../../utils/transaction-generator';
import { SharedData } from '../../../state';
import { describeScenarioStep } from '../../../__tests__/helpers';

// Mocks
const mockTransaction = { to: '0xabc' };
const createConcludeAndWithdrawMock = jest.fn().mockReturnValue(mockTransaction);
Object.defineProperty(TransactionGenerator, 'createConcludeAndWithdrawTransaction', {
  value: createConcludeAndWithdrawMock,
});

// Helpers
const itTransitionsToFailure = (
  result: { protocolState: states.WithdrawalState },
  failure: states.Failure,
) => {
  it(`transitions to failure with reason ${failure.reason}`, () => {
    expect(result.protocolState).toMatchObject(failure);
  });
};
const itTransitionsTo = (
  result: { protocolState: states.WithdrawalState },
  type: states.WithdrawalStateType,
) => {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
};

const itSendsConcludeAndWithdrawTransaction = (result: { sharedData: SharedData }) => {
  it('sends the conclude and withdraw transaction', () => {
    // TODO: This is painful :()
    expect(result.sharedData.outboxState.transactionOutbox[0]).toMatchObject({
      transactionRequest: mockTransaction,
    });
  });
};

// Scenario tests
describe('HAPPY PATH', () => {
  const scenario = scenarios.happyPath;
  const { sharedData } = scenario;

  describe('when initializing', () => {
    const { processId, withdrawalAmount, channelId } = scenario;
    const result = initialize(withdrawalAmount, channelId, processId, sharedData);

    itTransitionsTo(result, 'Withdrawing.WaitforApproval');
  });

  describeScenarioStep(scenario.waitForApproval, () => {
    const { state, action } = scenario.waitForApproval;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Withdrawing.WaitForTransaction');
    itSendsConcludeAndWithdrawTransaction(result);
  });

  describeScenarioStep(scenario.waitForTransaction, () => {
    const { state, action } = scenario.waitForTransaction;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Withdrawing.WaitForAcknowledgement');
  });

  describeScenarioStep(scenario.waitForAcknowledgement, () => {
    const { state, action } = scenario.waitForAcknowledgement;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Withdrawing.Success');
  });
});

describe('WITHDRAWAL REJECTED', () => {
  const scenario = scenarios.withdrawalRejected;
  const { sharedData } = scenario;

  describeScenarioStep(scenario.waitForApproval, () => {
    const { state, action } = scenario.waitForApproval;
    const result = reducer(state, sharedData, action);

    itTransitionsToFailure(result, scenario.failure);
  });
});

describe('transaction failed scenario', () => {
  const scenario = scenarios.failedTransaction;
  const { sharedData } = scenario;

  describeScenarioStep(scenario.waitForTransaction, () => {
    const { state, action } = scenario.waitForTransaction;
    const result = reducer(state, sharedData, action);
    itTransitionsToFailure(result, scenario.failure);
  });
});

describe('CHANNEL NOT CLOSED', () => {
  const scenario = scenarios.channelNotClosed;
  const { sharedData } = scenario;

  describe('when initializing', () => {
    const { processId, withdrawalAmount, channelId } = scenario;
    const result = initialize(withdrawalAmount, channelId, processId, sharedData);

    itTransitionsToFailure(result, scenario.failure);
  });
});
