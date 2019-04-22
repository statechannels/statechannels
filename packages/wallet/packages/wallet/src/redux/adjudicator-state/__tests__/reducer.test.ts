import * as actions from '../../actions';
import * as testScenarios from '../../__tests__/test-scenarios';
const { gameCommitment1, channelId } = testScenarios;
import { adjudicatorStateReducer } from '../reducer';
// tslint:disable: no-shadowed-variable

const createChallengeState = (channelId: string, expiryTime) => {
  return {
    channelId,
    balance: '0x0',
    finalized: false,
    challenge: {
      challengeCommitment: gameCommitment1,
      expiresAt: expiryTime,
    },
  };
};

describe('adjudicator state reducer', () => {
  const state = {};
  describe('when a challenge created event is received', () => {
    const expiryTime = 1234;
    const action = actions.challengeCreatedEvent(
      channelId,
      testScenarios.gameCommitment1,
      expiryTime,
    );
    const updatedState = adjudicatorStateReducer(state, action);
    it('sets a challenge', () => {
      expect(updatedState[channelId].challenge).toEqual({
        challengeCommitment: gameCommitment1,
        expiresAt: expiryTime,
      });
    });
  });

  describe('when a challenge expired event is received', () => {
    const state = {
      [channelId]: createChallengeState(channelId, 123),
    };
    const action = actions.challengeExpiredEvent('0x0', channelId, 1);
    const updatedState = adjudicatorStateReducer(state, action);

    it('clears the challenge', () => {
      expect(updatedState[channelId].challenge).toBeUndefined();
    });

    it('marks the challenge as finalized', () => {
      expect(updatedState[channelId].finalized).toBe(true);
    });
  });

  describe('when a refute event arrives', () => {
    const state = {
      [channelId]: createChallengeState(channelId, 123),
    };
    const action = actions.refutedEvent('0x0', channelId, gameCommitment1);
    const updatedState = adjudicatorStateReducer(state, action);

    it('clears the challenge', () => {
      expect(updatedState[channelId].challenge).toBeUndefined();
    });
  });

  describe('when a respond with move event arrives', () => {
    const state = {
      [channelId]: createChallengeState(channelId, 123),
    };
    const action = actions.respondWithMoveEvent('0x0', channelId, gameCommitment1);
    const updatedState = adjudicatorStateReducer(state, action);

    it('clears the challenge', () => {
      expect(updatedState[channelId].challenge).toBeUndefined();
    });
  });

  describe('when a concluded event arrives', () => {
    const state = {};
    const action = actions.concludedEvent('0x0', channelId);
    const updatedState = adjudicatorStateReducer(state, action);

    it('marks a channel as finalized', () => {
      expect(updatedState[channelId].finalized).toBe(true);
    });
  });
});
