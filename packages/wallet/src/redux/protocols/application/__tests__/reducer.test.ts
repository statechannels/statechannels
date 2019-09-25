import * as scenarios from './scenarios';
import * as states from '../states';
import { ProtocolStateWithSharedData } from '../..';
import { itSendsThisMessage, describeScenarioStep } from '../../../__tests__/helpers';
import { initialize, applicationReducer } from '../reducer';
import {
  VALIDATION_SUCCESS,
  SIGNATURE_SUCCESS,
  VALIDATION_FAILURE,
  SIGNATURE_FAILURE,
} from '../../../../magmo-wallet-client';

function whenIn(state) {
  return `when in ${state}`;
}

describe('when initializing', () => {
  const scenario = scenarios.initializingApplication;
  const result = initialize(
    scenario.initialize.sharedData,
    scenario.channelId,
    scenario.address,
    scenario.privateKey,
  );
  itTransitionsTo(result, 'Application.WaitForFirstCommitment');
});

describe('starting the application', () => {
  const scenario = scenarios.startingApplication;

  describeScenarioStep(scenario.addressKnown, () => {
    const { state, sharedData, action } = scenario.addressKnown;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, 'Application.Ongoing');
    itSendsThisMessage(result, SIGNATURE_SUCCESS);
  });
});

describe('signing a commitment', () => {
  const scenario = scenarios.receivingOurCommitment;

  describeScenarioStep(scenario.ongoing, () => {
    const { state, sharedData, action } = scenario.ongoing;
    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, 'Application.Ongoing');
    itSendsThisMessage(result, SIGNATURE_SUCCESS);
  });
});

describe('signing an invalid commitment', () => {
  const scenario = scenarios.receivingOurInvalidCommitment;

  describeScenarioStep(scenario.ongoing, () => {
    const { state, sharedData, action } = scenario.ongoing;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, 'Application.Ongoing');
    itSendsThisMessage(result, SIGNATURE_FAILURE);
  });
});

describe('validating a commitment', () => {
  const scenario = scenarios.receivingTheirCommitment;

  describe(whenIn('Application.Ongoing'), () => {
    const { state, sharedData, action } = scenario.ongoing;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, 'Application.Ongoing');
    itSendsThisMessage(result, VALIDATION_SUCCESS);
  });
});

describe('validating an invalid commitment', () => {
  const scenario = scenarios.receivingTheirInvalidCommitment;

  describeScenarioStep(scenario.ongoing, () => {
    const { state, sharedData, action } = scenario.ongoing;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, 'Application.Ongoing');
    itSendsThisMessage(result, VALIDATION_FAILURE);
  });
});

describe('receiving a close request', () => {
  const scenario = scenarios.receivingACloseRequest;

  describeScenarioStep(scenario.ongoing, () => {
    const { state, sharedData, action } = scenario.ongoing;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, 'Application.Success');
  });
});

describe('a challenge was requested', () => {
  const scenario = scenarios.challengeWasRequested;

  describeScenarioStep(scenario.ongoing, () => {
    const { state, sharedData, action } = scenario.ongoing;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, 'Application.WaitForDispute');
  });
});

describe('a challenge was detected', () => {
  const scenario = scenarios.challengeWasDetected;

  describeScenarioStep(scenario.ongoing, () => {
    const { state, sharedData, action } = scenario.ongoing;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, 'Application.WaitForDispute');
  });
});

describe('a challenge was responded to', () => {
  const scenario = scenarios.challengeRespondedTo;

  describeScenarioStep(scenario.waitForDispute, () => {
    const { state, sharedData, action } = scenario.waitForDispute;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, 'Application.Ongoing');
  });
});

describe('a challenge expired', () => {
  const scenario = scenarios.challengeExpired;

  describeScenarioStep(scenario.waitForDispute, () => {
    const { state, sharedData, action } = scenario.waitForDispute;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, 'Application.Success');
  });
});

function itTransitionsTo(
  result: ProtocolStateWithSharedData<states.ApplicationState>,
  type: states.ApplicationStateType,
) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
