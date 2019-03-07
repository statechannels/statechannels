import { JointState } from '../reducer';
import { RPSCommitment, asCoreCommitment } from '../../../core/rps-commitment';

export const itSends = (commitment: RPSCommitment, jointState) => {
  it(`sends ${commitment.commitmentName}`, () => {
    expect(jointState.messageState.opponentOutbox.commitment).toEqual(asCoreCommitment(commitment));
    expect(jointState.gameState.turnNum).toEqual(commitment.turnNum);
  });
};

export const itIncreasesTurnNumBy = (
  increase: number,
  oldState: JointState,
  newState: JointState,
) => {
  it(`increases the turnNum by ${increase}`, () => {
    if (!('turnNum' in newState.gameState) || !('turnNum' in oldState.gameState)) {
      return fail('turnNum does not exist on one of the states');
    }
    expect(newState.gameState.turnNum).toEqual(oldState.gameState.turnNum + increase);
  });
};

export const itTransitionsTo = (stateName, jointState) => {
  it(`transitions to ${stateName}`, () => {
    expect(jointState.gameState.name).toEqual(stateName);
  });
};

export const itStoresAction = (action, jointState) => {
  it(`stores action to retry`, () => {
    expect(jointState.messageState.actionToRetry).toEqual(action);
  });
};
