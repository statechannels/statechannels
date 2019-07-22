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
      const result = initialize(scenario.initialize);
      itSendsTheseCommitments(result, scenario.initialize.reply);
      itTransitionsTo(result, 'ConsensusUpdate.CommitmentSent');
    });

    describeScenarioStep(scenario.commitmentSent, () => {
      const { sharedData, action, state } = scenario.commitmentSent;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.Success');
      itSendsNoMessage(result);
    });
  });

  describe('Player A Not our turn', () => {
    const scenario = scenarios.twoPlayerANotOurTurn;
    describe('when initializing', () => {
      const result = initialize(scenario.initialize);

      itSendsNoMessage(result);
      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
    });

    describeScenarioStep(scenario.notSafeToSend, () => {
      const { sharedData, action, state, reply } = scenario.notSafeToSend;
      const result = consensusUpdateReducer(state, sharedData, action);

      itTransitionsTo(result, 'ConsensusUpdate.Success');
      itSendsTheseCommitments(result, reply); // fails
    });
  });

  describe('Player B Happy Path', () => {
    const scenario = scenarios.twoPlayerBHappyPath;
    describe('when initializing', () => {
      const result = initialize(scenario.initialize);

      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
      itSendsNoMessage(result);
    });

    describeScenarioStep(scenario.notSafeToSend, () => {
      const { sharedData, action, state, reply } = scenario.notSafeToSend;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.Success');
      itSendsTheseCommitments(result, reply);
    });

    describeScenarioStep(scenario.commitmentSent, () => {
      const { sharedData, action, state } = scenario.commitmentSent;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.Failure', states.FailureReason.ConsensusNotReached);
      itSendsNoMessage(result);
    });
  });

  describe('Player A Invalid Commitment', () => {
    const scenario = scenarios.twoPlayerACommitmentRejected;

    describeScenarioStep(scenario.wrongTurn, () => {
      const { sharedData, action, state } = scenario.wrongTurn;
      const result = consensusUpdateReducer(state, sharedData, action);

      itTransitionsTo(result, 'ConsensusUpdate.CommitmentSent');
      itSendsNoMessage(result);
    });

    describeScenarioStep(scenario.wrongProposalWhenCommitmentNotSent, () => {
      const { sharedData, action, state, reply } = scenario.wrongProposalWhenCommitmentNotSent;
      const result = consensusUpdateReducer(state, sharedData, action);

      itTransitionsTo(result, 'ConsensusUpdate.CommitmentSent');
      itSendsTheseCommitments(result, reply);
    });
  });

  describe('Player B Invalid Commitment', () => {
    const scenario = scenarios.twoPlayerBCommitmentRejected;

    describeScenarioStep(scenario.commitmentSent, () => {
      const { sharedData, action, state } = scenario.commitmentSent;
      const result = consensusUpdateReducer(state, sharedData, action);

      itTransitionsTo(result, 'ConsensusUpdate.CommitmentSent');
      itSendsNoMessage(result);
    });
  });
});

describe('Three Players', () => {
  describe('Player A Happy Path', () => {
    const scenario = scenarios.threePlayerAHappyPath;
    describe('when initializing', () => {
      const result = initialize(scenario.initialize);

      itTransitionsTo(result, 'ConsensusUpdate.CommitmentSent');
      itSendsTheseCommitments(result, scenario.initialize.reply);
    });

    describe("when receiving Player B's update", () => {
      const { sharedData, action, state } = scenario.waitForPlayerBUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.CommitmentSent');
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
      const result = initialize(scenario.initialize);

      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
    });

    describe('when receiving Cleared To Send on our turn', () => {
      const { sharedData, action, state, reply } = scenario.notSafeToSendAndOurTurn;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.CommitmentSent');
      itSendsTheseCommitments(result, reply);
    });

    describe('when receiving Cleared To Send not on our turn', () => {
      const { sharedData, action, state } = scenario.notSafeToSendAndNotOurTurn;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
      itSendsNoMessage(result);
      itSetsClearedToSend(result, true);
    });
  });

  describe('Player B Happy Path', () => {
    const scenario = scenarios.threePlayerBHappyPath;

    describe('when initializing', () => {
      const result = initialize(scenario.initialize);

      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
      itSendsNoMessage(result);
      itSetsClearedToSend(result, true);
    });

    describe("when receiving Player A's update", () => {
      const { sharedData, action, state, reply } = scenario.waitForPlayerAUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.CommitmentSent');
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
      const result = initialize(scenario.initialize);

      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
      itSetsClearedToSend(result, false);
      itSendsNoMessage(result);
    });

    describe('when receiving cleared to Send', () => {
      const { sharedData, action, state } = scenario.notClearedToSendAndNotOurTurn;
      const result = consensusUpdateReducer(state, sharedData, action);

      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
      itSendsNoMessage(result);
      itSetsClearedToSend(result, true);
    });

    describe("when receiving player A's update", () => {
      const { sharedData, action, state } = scenario.notClearedToSendAndOurTurn;
      const result = consensusUpdateReducer(state, sharedData, action);

      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
      itSendsNoMessage(result);
      itSetsClearedToSend(result, false);
    });
  });

  describe('Hub Happy Path', () => {
    const scenario = scenarios.threePlayerHubHappyPath;
    describe('when initializing', () => {
      const result = initialize(scenario.initialize);

      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
    });

    describe("when receiving Player A's update", () => {
      const { sharedData, action, state } = scenario.waitForPlayerAUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
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
      const result = initialize(scenario.initialize);

      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
      itSetsClearedToSend(result, false);
      itSendsNoMessage(result);
    });

    describe("when receiving Player A's update", () => {
      const { sharedData, action, state } = scenario.waitForPlayerAUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
      itSetsClearedToSend(result, false);
      itSendsNoMessage(result);
    });

    describe("when receiving Player B's update", () => {
      const { sharedData, action, state } = scenario.waitForPlayerBUpdate;
      const result = consensusUpdateReducer(state, sharedData, action);
      itSendsNoMessage(result);
      itSetsClearedToSend(result, false);
      itTransitionsTo(result, 'ConsensusUpdate.NotSafeToSend');
    });

    describe('when receiving cleared to send', () => {
      const { sharedData, action, state, reply } = scenario.waitForClearedToSend;
      const result = consensusUpdateReducer(state, sharedData, action);
      itSendsTheseCommitments(result, reply);
      itTransitionsTo(result, 'ConsensusUpdate.Success');
    });
  });
});

function itSetsClearedToSend(
  result: ProtocolStateWithSharedData<states.ConsensusUpdateState>,
  clearedToSend: boolean,
) {
  it('sets clearedToSend correctly', () => {
    expect((result.protocolState as states.NotSafeToSend).clearedToSend).toBe(clearedToSend);
  });
}

function itTransitionsTo(
  result: ProtocolStateWithSharedData<states.ConsensusUpdateState>,
  type: states.ConsensusUpdateStateType,
  reason?: string,
) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);

    if (reason) {
      expect((result.protocolState as states.Failure).reason).toEqual(reason);
    }
  });
}
