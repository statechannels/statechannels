import { WalletState } from '../../../states';

export const itSendsAMessage = (state: WalletState) => {
  it(`sends a message`, () => {
    expect(state.messageOutbox).toEqual(expect.anything());
  });
};

export const itSendsATransaction = (state: WalletState) => {
  it(`sends a transaction`, () => {
    expect(state.transactionOutbox).toEqual(expect.anything());
  });
};

export const itTransitionsToStateType = (type, state: WalletState) => {
  it(`transitions to ${type}`, () => {
    expect(state.type).toEqual(type);
  });
};

export const itDoesntTransition = (oldState: WalletState, newState: WalletState) => {
  it(`doesn't transition`, () => {
    expect(newState.type).toEqual(oldState.type);
  });
};

export const itIncreasesTurnNumBy = (increase: number, oldState: WalletState, newState: WalletState) => {
  it(`increases the turnNum by ${increase}`, () => {
    if (!('turnNum' in newState) || !('turnNum' in oldState)) {
      return fail('turnNum does not exist on one of the states');
    }
    expect(newState.turnNum).toEqual(oldState.turnNum + increase);
  });
};
