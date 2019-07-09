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
        clearedToSend,
        proposedAllocation,
        proposedDestination,
        sharedData,
      } = scenario.initialize;
      const result = initialize(
        processId,
        channelId,
        clearedToSend,
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
        clearedToSend,
        proposedAllocation,
        proposedDestination,
        sharedData,
      } = scenario.initialize;
      const result = initialize(
        processId,
        channelId,
        clearedToSend,
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
        clearedToSend,
        proposedAllocation,
        proposedDestination,
        sharedData,
      } = scenario.initialize;
      const result = initialize(
        processId,
        channelId,
        clearedToSend,
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

  describe('Player A waiting for Cleared To Send', () => {
    const scenario = scenarios.threePlayerANotClearedToSend;
    describe('when initializing', () => {
      const {
        processId,
        channelId,
        clearedToSend,
        proposedAllocation,
        proposedDestination,
        sharedData,
      } = scenario.initialize;
      const result = initialize(
        processId,
        channelId,
        clearedToSend,
        proposedAllocation,
        proposedDestination,
        sharedData,
      );

      itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
    });

    describe('when receiving Cleared To Send', () => {
      const { sharedData, action, state } = scenario.waitForUpdateAndClearedToSend;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
      itSendsTheseCommitments(result, scenario.waitForUpdateAndClearedToSend.reply);
      itSetsClearedToSendAndUpdateSent(result, true, true);
    });
  });

  describe('Player B Happy Path', () => {
    const scenario = scenarios.threePlayerBHappyPath;
    describe('when initializing', () => {
      const {
        processId,
        channelId,
        clearedToSend,
        proposedAllocation,
        proposedDestination,
        sharedData,
      } = scenario.initialize;
      const result = initialize(
        processId,
        channelId,
        clearedToSend,
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

  describe('Player B waiting for Cleared To send', () => {
    const scenario = scenarios.threePlayerBNotClearedToSend;
    describe('when initializing', () => {
      const {
        processId,
        channelId,
        clearedToSend,
        proposedAllocation,
        proposedDestination,
        sharedData,
      } = scenario.initialize;
      const result = initialize(
        processId,
        channelId,
        clearedToSend,
        proposedAllocation,
        proposedDestination,
        sharedData,
      );

      itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
      itSetsClearedToSendAndUpdateSent(result, false, false);
      itSendsNoMessage(result);
    });

    describe('when receiving cleared to Send', () => {
      const { sharedData, action, state } = scenario.waitForUpdateAndClearedToSend;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
      itSendsNoMessage(result);
      itSetsClearedToSendAndUpdateSent(result, true, false);
    });

    describe("when receiving player A's update", () => {
      const { sharedData, action, state, reply } = scenario.waitForPlayerAUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
      itSendsTheseCommitments(result, reply);
      itSetsClearedToSendAndUpdateSent(result, true, true);
    });
  });

  describe('Hub Happy Path', () => {
    const scenario = scenarios.threePlayerHubHappyPath;
    describe('when initializing', () => {
      const {
        processId,
        channelId,
        clearedToSend,
        proposedAllocation,
        proposedDestination,
        sharedData,
      } = scenario.initialize;
      const result = initialize(
        processId,
        channelId,
        clearedToSend,
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

  describe('Hub waiting for Cleared To Send', () => {
    const scenario = scenarios.threePlayerHubNotClearedToSend;
    describe('when initializing', () => {
      const {
        processId,
        channelId,
        clearedToSend,
        proposedAllocation,
        proposedDestination,
        sharedData,
      } = scenario.initialize;
      const result = initialize(
        processId,
        channelId,
        clearedToSend,
        proposedAllocation,
        proposedDestination,
        sharedData,
      );

      itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
      itSetsClearedToSendAndUpdateSent(result, false, false);
      itSendsNoMessage(result);
    });

    describe("when receiving Player A's update", () => {
      const { sharedData, action, state } = scenario.waitForPlayerAUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
      itSetsClearedToSendAndUpdateSent(result, false, false);
      itSendsNoMessage(result);
    });

    describe("when receiving Player B's update", () => {
      const { sharedData, action, state } = scenario.waitForPlayerBUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itSendsNoMessage(result);
      itSetsClearedToSendAndUpdateSent(result, false, false);
      itTransitionsTo(result, 'ConsensusUpdate.WaitForUpdate');
    });
    describe('when receiving cleared to send', () => {
      const { sharedData, action, state, reply } = scenario.waitForClearedToSend;
      const result = consensusUpdateReducer(state, sharedData, action);
      itSendsTheseCommitments(result, reply);
      itTransitionsTo(result, 'ConsensusUpdate.Success');
    });
  });
});

function itSetsClearedToSendAndUpdateSent(
  result: ProtocolStateWithSharedData<states.ConsensusUpdateState>,
  clearedToSend: boolean,
  updateSent: boolean,
) {
  it('sets clearedToSend correctly', () => {
    expect((result.protocolState as states.WaitForUpdate).clearedToSend).toBe(clearedToSend);
  });

  it('sets updateSent correctly', () => {
    expect((result.protocolState as states.WaitForUpdate).updateSent).toBe(updateSent);
  });
}
function itTransitionsTo(
  result: ProtocolStateWithSharedData<states.ConsensusUpdateState>,
  type: states.ConsensusUpdateStateType,
) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
