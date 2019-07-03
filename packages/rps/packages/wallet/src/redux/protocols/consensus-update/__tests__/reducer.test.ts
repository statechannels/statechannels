import * as scenarios from './scenarios';
import { initialize, consensusUpdateReducer } from '../reducer';
import * as states from '../states';
import { ProtocolStateWithSharedData } from '../..';
import {
  describeScenarioStep,
  itSendsTheseCommitments,
  itSendsNoMessage,
} from '../../../__tests__/helpers';

describe('Two Players', () => {
  describe('Player A Happy Path', () => {
    const scenario = scenarios.twoPlayerAHappyPath;
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
      itSendsTheseCommitments(result, scenario.initialize.reply);
      itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
    });
    describeScenarioStep(scenario.waitForUpdate, () => {
      const { sharedData, action, state } = scenario.waitForUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.Success');
      itSendsNoMessage(result);
    });
  });

  describe('Player B Happy Path', () => {
    const scenario = scenarios.twoPlayerBHappyPath;
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
      itSendsNoMessage(result);
    });
    describeScenarioStep(scenario.waitForUpdate, () => {
      const { sharedData, action, state, reply } = scenario.waitForUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.Success');
      itSendsTheseCommitments(result, reply);
    });
  });

  describe('Player A Invalid Commitment', () => {
    const scenario = scenarios.twoPlayerACommitmentRejected;

    describeScenarioStep(scenario.waitForUpdate, () => {
      const { sharedData, action, state } = scenario.waitForUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.Failure');
      itSendsNoMessage(result);
    });
  });

  describe('Player B Invalid Commitment', () => {
    const scenario = scenarios.twoPlayerBCommitmentRejected;

    describeScenarioStep(scenario.waitForUpdate, () => {
      const { sharedData, action, state } = scenario.waitForUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.Failure');
      itSendsNoMessage(result);
    });
  });
});

describe('Three Players', () => {
  describe('Player A Happy Path', () => {
    const scenario = scenarios.threePlayerAHappyPath;
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
      itSendsTheseCommitments(result, scenario.initialize.reply);
    });

    describe("when receiving Player B's update", () => {
      const { sharedData, action, state } = scenario.waitForPlayerBUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
      itSendsNoMessage(result);
    });

    describe("when receiving hub's update", () => {
      const { sharedData, action, state } = scenario.waitForHubUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.Success');
      itSendsNoMessage(result);
    });
  });

  describe('Player B Happy Path', () => {
    const scenario = scenarios.threePlayerBHappyPath;
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
      itSendsNoMessage(result);
    });

    describe("when receiving Player A's update", () => {
      const { sharedData, action, state, reply } = scenario.waitForPlayerAUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
      itSendsTheseCommitments(result, reply);
    });

    describe("when receiving hub's update", () => {
      const { sharedData, action, state } = scenario.waitForHubUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.Success');
      itSendsNoMessage(result);
    });
  });

  describe('Hub Happy Path', () => {
    const scenario = scenarios.threePlayerHubHappyPath;
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

    describe("when receiving Player A's update", () => {
      const { sharedData, action, state } = scenario.waitForPlayerAUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
      itSendsNoMessage(result);
    });

    describe("when receiving Player B's update", () => {
      const { sharedData, action, state, reply } = scenario.waitForPlayerBUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itSendsTheseCommitments(result, reply);
      itTransitionsTo(result, 'ConsensusUpdate.Success');
    });
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
