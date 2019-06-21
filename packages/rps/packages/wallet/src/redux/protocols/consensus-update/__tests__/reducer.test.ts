import * as scenarios from './scenarios';
import { initialize, consensusUpdateReducer } from '../reducer';
import * as states from '../states';
import { ProtocolStateWithSharedData } from '../..';
import { describeScenarioStep } from '../../../__tests__/helpers';

describe('Player A Happy Path', () => {
  const scenario = scenarios.aHappyPath;
  describe('when initializing', () => {
    const {
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
      sharedData,
    } = scenario.initialize;
    const result = initialize(
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
      sharedData,
    );

    itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
  });
  describeScenarioStep(scenario.waitForUpdate, () => {
    const { sharedData, action, state } = scenario.waitForUpdate;
    const result = consensusUpdateReducer(state, sharedData, action);
    itTransitionsTo(result, 'ConsensusUpdate.Success');
  });
});

describe('Player B Happy Path', () => {
  const scenario = scenarios.aHappyPath;
  describe('when initializing', () => {
    const {
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
      sharedData,
    } = scenario.initialize;
    const result = initialize(
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
      sharedData,
    );

    itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
  });
  describeScenarioStep(scenario.waitForUpdate, () => {
    const { sharedData, action, state } = scenario.waitForUpdate;
    const result = consensusUpdateReducer(state, sharedData, action);
    itTransitionsTo(result, 'ConsensusUpdate.Success');
  });
});

describe('Player A Invalid Commitment', () => {
  const scenario = scenarios.aCommitmentRejected;

  describeScenarioStep(scenario.waitForUpdate, () => {
    const { sharedData, action, state } = scenario.waitForUpdate;
    const result = consensusUpdateReducer(state, sharedData, action);
    itTransitionsTo(result, 'ConsensusUpdate.Failure');
  });
});

describe('Player B Invalid Commitment', () => {
  const scenario = scenarios.bCommitmentRejected;

  describeScenarioStep(scenario.waitForUpdate, () => {
    const { sharedData, action, state } = scenario.waitForUpdate;
    const result = consensusUpdateReducer(state, sharedData, action);
    itTransitionsTo(result, 'ConsensusUpdate.Failure');
  });
});

function itTransitionsTo(
  result: ProtocolStateWithSharedData<states.ConsensusUpdateState>,
  type: states.ConsensusUpdateStateType,
) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
