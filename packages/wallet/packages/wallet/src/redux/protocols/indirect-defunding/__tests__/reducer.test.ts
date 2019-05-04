import * as states from '../state';
import { initialize, indirectDefundingReducer } from '../reducer';
import * as scenarios from './scenarios';
import { ProtocolStateWithSharedData } from '../..';
import { expectThisCommitmentSent } from '../../../__tests__/helpers';
import * as SigningUtil from '../../../../domain/signing-utils';
import { Commitment } from '../../../../domain';

// Mocks
const validateMock = jest.fn().mockReturnValue(true);
Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

// Helper functions
const itTransitionsTo = (
  result: { protocolState: states.IndirectDefundingState },
  type: string,
) => {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
};

const itTransitionsToFailure = (
  result: { protocolState: states.IndirectDefundingState },
  failure: states.Failure,
) => {
  it(`transitions to failure with reason ${failure.reason}`, () => {
    expect(result.protocolState).toMatchObject(failure);
  });
};

export const itSendsThisCommitment = (
  state: ProtocolStateWithSharedData<states.IndirectDefundingState>,
  commitment: Partial<Commitment>,
) => {
  it('sends the correct commitment', () => {
    expectThisCommitmentSent(state.sharedData, commitment);
  });
};

// Tests
describe('player A happy path', () => {
  const scenario = scenarios.playerAHappyPath;
  const { processId, channelId, sharedData, proposedAllocation, proposedDestination } = scenario;

  describe('when initializing', () => {
    const result = initialize(
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
      sharedData.initializingSharedData,
    );
    itTransitionsTo(result, states.WAIT_FOR_LEDGER_UPDATE);
    itSendsThisCommitment(result, scenario.firstUpdateCommitment);
  });

  describe(`when in ${states.WAIT_FOR_LEDGER_UPDATE}`, () => {
    const state = scenario.states.waitForLedgerUpdate;
    const action = scenario.actions.commitmentReceived;
    const result = indirectDefundingReducer(
      state,
      sharedData.waitForLedgerUpdateSharedData,
      action,
    );

    itSendsThisCommitment(result, scenario.secondUpdateCommitment);
    itTransitionsTo(result, states.SUCCESS);
  });
});

describe('player B happy path', () => {
  const scenario = scenarios.playerBHappyPath;
  const { processId, channelId, proposedAllocation, proposedDestination, sharedData } = scenario;

  describe('when initializing', () => {
    const result = initialize(
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
      sharedData.initializingSharedData,
    );
    itTransitionsTo(result, states.WAIT_FOR_LEDGER_UPDATE);
  });

  describe(`when in ${states.WAIT_FOR_LEDGER_UPDATE}`, () => {
    const state = scenario.states.waitForLedgerUpdate;
    const action = scenario.actions.firstCommitmentReceived;
    const result = indirectDefundingReducer(state, sharedData.initializingSharedData, action);

    itSendsThisCommitment(result, scenario.updateCommitment);
    itTransitionsTo(result, states.WAIT_FOR_FINAL_LEDGER_UPDATE);
  });

  describe(`when in ${states.WAIT_FOR_FINAL_LEDGER_UPDATE}`, () => {
    const state = scenario.states.waitForFinalLedgerUpdate;
    const action = scenario.actions.finalCommitmentReceived;
    const result = indirectDefundingReducer(state, sharedData.waitForFinalUpdateSharedData, action);

    itTransitionsTo(result, states.SUCCESS);
  });
});

describe('not defundable', () => {
  const scenario = scenarios.notDefundable;
  const { processId, channelId, proposedAllocation, proposedDestination, sharedData } = scenario;

  describe('when initializing', () => {
    const result = initialize(
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
      sharedData,
    );
    itTransitionsToFailure(result, scenario.states.failure);
  });
});

describe('player A invalid commitment', () => {
  const scenario = scenarios.playerAInvalidCommitment;
  const { sharedData } = scenario;

  describe(`when in ${states.WAIT_FOR_LEDGER_UPDATE}`, () => {
    const state = scenario.states.waitForLedgerUpdate;
    const action = scenario.actions.commitmentReceived;
    const result = indirectDefundingReducer(state, sharedData, action);
    itTransitionsToFailure(result, scenario.states.failure);
  });
});

describe('player B invalid first commitment', () => {
  const scenario = scenarios.playerBInvalidFirstCommitment;
  const { sharedData } = scenario;

  describe(`when in ${states.WAIT_FOR_LEDGER_UPDATE}`, () => {
    const state = scenario.states.waitForLedgerUpdate;
    const action = scenario.actions.firstCommitmentReceived;
    const result = indirectDefundingReducer(state, sharedData, action);
    itTransitionsToFailure(result, scenario.states.failure);
  });
});

describe('player B invalid final commitment', () => {
  const scenario = scenarios.playerBInvalidFinalCommitment;
  const { sharedData } = scenario;

  describe(`when in ${states.WAIT_FOR_FINAL_LEDGER_UPDATE}`, () => {
    const state = scenario.states.waitForFinalLedgerUpdate;
    const action = scenario.actions.finalCommitmentReceived;
    const result = indirectDefundingReducer(state, sharedData, action);
    itTransitionsToFailure(result, scenario.states.failure);
  });
});
