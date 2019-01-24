import { JointState } from '../reducer';

export const itSends = (position, jointState) => {
  it(`sends ${position.name}`, () => {
    expect(jointState.messageState.opponentOutbox.position).toEqual(position);
    expect(jointState.gameState.turnNum).toEqual(position.turnNum);
  });
};

export const itIncreasesTurnNumBy = (increase: number, oldState: JointState, newState: JointState) => {
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


