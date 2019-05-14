import * as scenarios from './scenarios';
import * as states from '../states';
import { ProtocolStateWithSharedData } from '../..';
import { itSendsThisMessage } from '../../../__tests__/helpers';
import { initialize, applicationReducer } from '../reducer';
import {
  VALIDATION_SUCCESS,
  SIGNATURE_SUCCESS,
  VALIDATION_FAILURE,
  SIGNATURE_FAILURE,
} from 'magmo-wallet-client';

function whenIn(state) {
  return `when in ${state}`;
}

describe('initializing the application', () => {
  const scenario = scenarios.initializingApplication;
  const result = initialize(scenario.storage);
  itTransitionsTo(result, states.ADDRESS_KNOWN);
});

describe('starting the application', () => {
  const scenario = scenarios.startingApplication;
  const sharedData = scenario.storage;

  describe(whenIn(states.ADDRESS_KNOWN), () => {
    const state = scenario.states.addressKnown;
    const action = scenario.actions.receivePreFundSetup;
    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, states.ONGOING);
    itSendsThisMessage(result, SIGNATURE_SUCCESS);
  });
});

describe('signing a commitment', () => {
  const scenario = scenarios.receivingOurCommitment;
  const sharedData = scenario.storage;

  describe(whenIn(states.ONGOING), () => {
    const state = scenario.states.ongoing;
    const action = scenario.actions.receiveOurCommitment;
    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, states.ONGOING);
    itSendsThisMessage(result, SIGNATURE_SUCCESS);
  });
});

describe('signing an invalid commitment', () => {
  const scenario = scenarios.receivingOurInvalidCommitment;
  const sharedData = scenario.storage;

  describe(whenIn(states.ONGOING), () => {
    const state = scenario.states.ongoing;
    const action = scenario.actions.receiveOurInvalidCommitment;
    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, states.ONGOING);
    itSendsThisMessage(result, SIGNATURE_FAILURE);
  });
});

describe('validating a commitment', () => {
  const scenario = scenarios.receivingTheirCommitment;
  const sharedData = scenario.storage;

  describe(whenIn(states.ONGOING), () => {
    const state = scenario.states.ongoing;
    const action = scenario.actions.receiveTheirCommitment;
    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, states.ONGOING);
    itSendsThisMessage(result, VALIDATION_SUCCESS);
  });
});

describe('validating an invalid commitment', () => {
  const scenario = scenarios.receivingTheirInvalidCommitment;
  const sharedData = scenario.storage;

  describe(whenIn(states.ONGOING), () => {
    const state = scenario.states.ongoing;
    const action = scenario.actions.receiveTheirInvalidCommitment;
    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, states.ONGOING);
    itSendsThisMessage(result, VALIDATION_FAILURE);
  });
});

describe('receiving a close request', () => {
  const scenario = scenarios.receivingACloseRequest;
  const sharedData = scenario.storage;

  describe(whenIn(states.ONGOING), () => {
    const state = scenario.states.ongoing;
    const action = scenario.actions.concludeRequested;
    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, states.SUCCESS);
  });
});

function itTransitionsTo(
  result: ProtocolStateWithSharedData<states.ApplicationState>,
  type: string,
) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
