import * as scenarios from './scenarios';
import { initialize, responderReducer } from '../reducer';

import * as states from '../states';
import { Commitment } from '../../../../../domain';
import * as TransactionGenerator from '../../../../../utils/transaction-generator';
import { SHOW_WALLET, HIDE_WALLET, CHALLENGE_COMPLETE } from '../../../../../magmo-wallet-client';
import { itSendsThisDisplayEventType, itSendsThisMessage } from '../../../../__tests__/helpers';
import { describeScenarioStep } from '../../../../__tests__/helpers';

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
  result: { protocolState: states.ResponderState },
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

const itTransitionsTo = (
  result: { protocolState: states.ResponderState },
  type: states.ResponderStateType,
) => {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
};

const itSetsChallengeCommitment = (
  result: { protocolState: states.ResponderState },
  commitment: Commitment,
) => {
  it('sets the correct challenge commitment', () => {
    expect((result.protocolState as states.WaitForApproval).challengeCommitment).toMatchObject(
      commitment,
    );
  });
};

describe('RESPOND WITH EXISTING MOVE HAPPY-PATH', () => {
  const scenario = scenarios.respondWithExistingCommitmentHappyPath;
  const { sharedData, processId, channelId } = scenario;

  describe('when initializing', () => {
    const { challengeCommitment, expiryTime } = scenario;
    const result = initialize(processId, channelId, expiryTime, sharedData, challengeCommitment);

    itTransitionsTo(result, 'Responding.WaitForApproval');
    itSendsThisDisplayEventType(result.sharedData, SHOW_WALLET);
    itSetsChallengeCommitment(result, challengeCommitment);
  });

  describeScenarioStep(scenario.waitForApproval, () => {
    const { state, action, responseCommitment } = scenario.waitForApproval;
    const result = responderReducer(state, sharedData, action);

    itTransitionsTo(result, 'Responding.WaitForTransaction');
    itCallsRespondWithMoveWith(responseCommitment);
  });

  describeScenarioStep(scenario.waitForTransaction, () => {
    const { state, action } = scenario.waitForTransaction;

    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, 'Responding.WaitForAcknowledgement');
  });

  describeScenarioStep(scenario.waitForAcknowledgement, () => {
    const { state, action } = scenario.waitForAcknowledgement;

    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, 'Responding.Success');
  });
});

describe('REFUTE HAPPY-PATH ', () => {
  const scenario = scenarios.refuteHappyPath;
  const { sharedData, processId, channelId } = scenario;

  describe('when initializing', () => {
    const { challengeCommitment, expiryTime } = scenario;
    const result = initialize(processId, channelId, expiryTime, sharedData, challengeCommitment);

    itTransitionsTo(result, 'Responding.WaitForApproval');
    itSetsChallengeCommitment(result, scenario.challengeCommitment);
  });

  describeScenarioStep(scenario.waitForApproval, () => {
    const { state, action, refuteCommitment } = scenario.waitForApproval;

    const result = responderReducer(state, sharedData, action);

    itTransitionsTo(result, 'Responding.WaitForTransaction');
    itCallsRefuteWith(refuteCommitment);
  });

  describeScenarioStep(scenario.waitForTransaction, () => {
    const { state, action } = scenario.waitForTransaction;

    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, 'Responding.WaitForAcknowledgement');
  });

  describeScenarioStep(scenario.waitForAcknowledgement, () => {
    const { state, action } = scenario.waitForAcknowledgement;

    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, 'Responding.Success');
  });
});

describe('REQUIRE RESPONSE HAPPY-PATH ', () => {
  const scenario = scenarios.requireResponseHappyPath;
  const { sharedData, processId, channelId, expiryTime } = scenario;

  describe('when initializing', () => {
    const result = initialize(
      processId,
      channelId,
      expiryTime,
      sharedData,
      scenario.challengeCommitment,
    );
    itTransitionsTo(result, 'Responding.WaitForApproval');
    itSetsChallengeCommitment(result, scenario.challengeCommitment);
  });

  describeScenarioStep(scenario.waitForApprovalRequiresResponse, () => {
    const { state, action } = scenario.waitForApprovalRequiresResponse;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, 'Responding.WaitForResponse');
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });

  describeScenarioStep(scenario.waitForResponse, () => {
    const { state, action, responseCommitment } = scenario.waitForResponse;
    const result = responderReducer(state, sharedData, action);
    itSendsThisDisplayEventType(result.sharedData, SHOW_WALLET);
    itTransitionsTo(result, 'Responding.WaitForTransaction');
    itCallsRespondWithMoveWith(responseCommitment);
  });

  describeScenarioStep(scenario.waitForTransaction, () => {
    const { state, action } = scenario.waitForTransaction;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, 'Responding.WaitForAcknowledgement');
  });

  describeScenarioStep(scenario.waitForAcknowledgement, () => {
    const { state, action } = scenario.waitForAcknowledgement;
    const result = responderReducer(state, sharedData, action);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
    itSendsThisMessage(result.sharedData, CHALLENGE_COMPLETE);
    itTransitionsTo(result, 'Responding.Success');
  });
});

describe('TRANSACTION FAILED ', () => {
  const scenario = scenarios.transactionFails;
  const { sharedData } = scenario;

  describeScenarioStep(scenario.waitForTransaction, () => {
    const { state, action } = scenario.waitForTransaction;
    const result = responderReducer(state, sharedData, action);
    itTransitionsToFailure(result, scenario.failure);
  });
});

describe('CHALLENGE EXPIRES AND CHANNEL not DEFUNDED', () => {
  const scenario = scenarios.challengeExpires;
  const { sharedData } = scenario;

  describeScenarioStep(scenario.waitForResponse, () => {
    const { state, action } = scenario.waitForResponse;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, 'Responding.AcknowledgeTimeout');
    itSendsThisDisplayEventType(result.sharedData, SHOW_WALLET);
    itSendsThisMessage(result.sharedData, 'WALLET.CONCLUDE.OPPONENT');
  });

  describeScenarioStep(scenario.acknowledgeTimeout, () => {
    const { state, action } = scenario.acknowledgeTimeout;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, 'Responding.Failure');
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('CHALLENGE EXPIRES AND CHANNEL DEFUNDED', () => {
  const scenario = scenarios.challengeExpiresAndDefund;
  const { sharedData } = scenario;

  describeScenarioStep(scenario.defund, () => {
    const { state, action } = scenario.defund;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, 'Responding.Failure');
  });
});

describe('CHALLENGE EXPIRES when in WaitForTransaction', () => {
  const scenario = scenarios.challengeExpiresDuringWaitForTransaction;
  const { sharedData } = scenario;

  describeScenarioStep(scenario.waitForTransaction, () => {
    const { state, action } = scenario.waitForTransaction;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, 'Responding.AcknowledgeTimeout');
    itSendsThisMessage(result.sharedData, 'WALLET.CONCLUDE.OPPONENT');
  });
});

describe('CHALLENGE EXPIRES when in WaitForApproval', () => {
  const scenario = scenarios.challengeExpiresDuringWaitForApproval;
  const { sharedData } = scenario;

  describeScenarioStep(scenario.waitForApprovalRespond, () => {
    const { state, action } = scenario.waitForApprovalRespond;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, 'Responding.AcknowledgeTimeout');
    itSendsThisMessage(result.sharedData, 'WALLET.CONCLUDE.OPPONENT');
  });
});
