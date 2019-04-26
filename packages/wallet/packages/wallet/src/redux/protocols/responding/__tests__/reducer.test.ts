import * as scenarios from './scenarios';
import { initialize, respondingReducer } from '../reducer';

import * as states from '../state';
import { Commitment } from '../../../../domain';
import * as TransactionGenerator from '../../../../utils/transaction-generator';

// Mocks
const mockTransaction = { to: '0xabc' };
const createRespondWithMoveMock = jest.fn().mockReturnValue(mockTransaction);
const refuteMock = jest.fn().mockReturnValue(mockTransaction);
Object.defineProperty(TransactionGenerator, 'createRespondWithMoveTransaction', {
  value: createRespondWithMoveMock,
});
Object.defineProperty(TransactionGenerator, 'createRefuteTransaction', {
  value: refuteMock,
});

// helpers
const itTransitionsToFailure = (
  result: { protocolState: states.RespondingState },
  failure: states.Failure,
) => {
  it(`transitions to failure with reason ${failure.reason}`, () => {
    expect(result.protocolState).toMatchObject(failure);
  });
};

const itCallsRespondWithMoveWith = (challengeCommitment: Commitment) => {
  it('calls respond with move with the correct commitment', () => {
    expect(createRespondWithMoveMock).toHaveBeenCalledWith(
      challengeCommitment,
      jasmine.any(String),
    );
  });
};

const itCallsRefuteWith = (refuteCommitment: Commitment) => {
  it('calls refute with the correct commitment', () => {
    expect(refuteMock).toHaveBeenCalledWith(refuteCommitment, jasmine.any(String));
  });
};

const itTransitionsTo = (result: { protocolState: states.RespondingState }, type: string) => {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
};

const itSetsChallengeCommitment = (
  result: { protocolState: states.RespondingState },
  commitment: Commitment,
) => {
  it('sets the correct challenge commitment', () => {
    expect((result.protocolState as states.WaitForApproval).challengeCommitment).toMatchObject(
      commitment,
    );
  });
};

describe('respond with existing move happy-path scenario', () => {
  const scenario = scenarios.respondWithExistingCommitmentHappyPath;
  const { sharedData, processId } = scenario;

  describe('when initializing', () => {
    const { challengeCommitment } = scenario;
    const result = initialize(processId, sharedData, challengeCommitment);

    itTransitionsTo(result, states.WAIT_FOR_APPROVAL);
    itSetsChallengeCommitment(result, scenario.challengeCommitment);
  });

  describe(`when in ${states.WAIT_FOR_APPROVAL}`, () => {
    const state = scenario.waitForApproval;
    const action = scenario.approve;

    const result = respondingReducer(state, sharedData, action);

    itTransitionsTo(result, states.WAIT_FOR_TRANSACTION);
    itCallsRespondWithMoveWith(scenario.responseCommitment);
  });

  describe(`when in ${states.WAIT_FOR_TRANSACTION}`, () => {
    const state = scenario.waitForTransaction;
    const action = scenario.transactionConfirmed;

    const result = respondingReducer(state, sharedData, action);
    itTransitionsTo(result, states.WAIT_FOR_ACKNOWLEDGEMENT);
  });

  describe(`when in ${states.WAIT_FOR_ACKNOWLEDGEMENT}`, () => {
    const state = scenario.waitForAcknowledgement;
    const action = scenario.acknowledge;

    const result = respondingReducer(state, sharedData, action);
    itTransitionsTo(result, states.SUCCESS);
  });
});

describe('refute happy-path scenario', () => {
  const scenario = scenarios.refuteHappyPath;
  const { sharedData, processId } = scenario;

  describe('when initializing', () => {
    const { challengeCommitment } = scenario;
    const result = initialize(processId, sharedData, challengeCommitment);

    itTransitionsTo(result, states.WAIT_FOR_APPROVAL);
    itSetsChallengeCommitment(result, scenario.challengeCommitment);
  });

  describe(`when in ${states.WAIT_FOR_APPROVAL}`, () => {
    const state = scenario.waitForApproval;
    const action = scenario.approve;

    const result = respondingReducer(state, sharedData, action);

    itTransitionsTo(result, states.WAIT_FOR_TRANSACTION);
    itCallsRefuteWith(scenario.refuteCommitment);
  });

  describe(`when in ${states.WAIT_FOR_TRANSACTION}`, () => {
    const state = scenario.waitForTransaction;
    const action = scenario.transactionConfirmed;

    const result = respondingReducer(state, sharedData, action);
    itTransitionsTo(result, states.WAIT_FOR_ACKNOWLEDGEMENT);
  });

  describe(`when in ${states.WAIT_FOR_ACKNOWLEDGEMENT}`, () => {
    const state = scenario.waitForAcknowledgement;
    const action = scenario.acknowledge;

    const result = respondingReducer(state, sharedData, action);
    itTransitionsTo(result, states.SUCCESS);
  });
});

describe('select response happy-path scenario', () => {
  const scenario = scenarios.requireResponseHappyPath;
  const { sharedData, processId } = scenario;

  describe('when initializing', () => {
    const result = initialize(processId, sharedData, scenario.challengeCommitment);

    itTransitionsTo(result, states.WAIT_FOR_APPROVAL);
    itSetsChallengeCommitment(result, scenario.challengeCommitment);
  });

  describe(`when in ${states.WAIT_FOR_APPROVAL}`, () => {
    const state = scenario.waitForApproval;
    const action = scenario.approve;

    const result = respondingReducer(state, sharedData, action);

    itTransitionsTo(result, states.WAIT_FOR_RESPONSE);
  });

  describe(`when in ${states.WAIT_FOR_RESPONSE}`, () => {
    const state = scenario.waitForResponse;
    const action = scenario.responseProvided;

    const result = respondingReducer(state, sharedData, action);

    itTransitionsTo(result, states.WAIT_FOR_TRANSACTION);
    itCallsRespondWithMoveWith(scenario.responseCommitment);
  });

  describe(`when in ${states.WAIT_FOR_TRANSACTION}`, () => {
    const state = scenario.waitForTransaction;
    const action = scenario.transactionConfirmed;

    const result = respondingReducer(state, sharedData, action);
    itTransitionsTo(result, states.WAIT_FOR_ACKNOWLEDGEMENT);
  });

  describe(`when in ${states.WAIT_FOR_ACKNOWLEDGEMENT}`, () => {
    const state = scenario.waitForAcknowledgement;
    const action = scenario.acknowledge;

    const result = respondingReducer(state, sharedData, action);
    itTransitionsTo(result, states.SUCCESS);
  });
});

describe('user declines scenario', () => {
  const scenario = scenarios.userDeclines;
  const { sharedData } = scenario;

  describe(`when in ${states.WAIT_FOR_APPROVAL}`, () => {
    const state = scenario.waitForApproval;
    const action = scenario.reject;

    const result = respondingReducer(state, sharedData, action);

    itTransitionsToFailure(result, scenario.failure);
  });
});

describe('transaction failed scenario', () => {
  const scenario = scenarios.transactionFails;
  const { sharedData } = scenario;

  describe(`when in ${states.WAIT_FOR_TRANSACTION}`, () => {
    const state = scenario.waitForTransaction;
    const action = scenario.transactionFailed;

    const result = respondingReducer(state, sharedData, action);
    itTransitionsToFailure(result, scenario.failure);
  });
});
