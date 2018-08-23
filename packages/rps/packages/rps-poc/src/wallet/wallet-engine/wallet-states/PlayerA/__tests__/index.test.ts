import * as WalletStates from '..';

describe('ReadyToDeploy', () => {
  const transaction = { some: 'properties to craft a transaction' };
  const walletState = new WalletStates.ReadyToDeploy({ transaction });

  it('has a transaction', () => {
    expect(walletState.transaction).toEqual(transaction);
  });
  it('is ready to send', () => {
    expect(walletState.isReadyToSend).toBe(true);
  });
});

describe('WaitForBToDeposit', () => {
  const adjudicator = 'address';
  const walletState = new WalletStates.WaitForBToDeposit({ adjudicator });

  it('returns the adjudicator address', () => {
    expect(walletState.adjudicator).toEqual(adjudicator);
  });
});

describe('Funded', () => {
  const adjudicator = 'address';
  const walletState = new WalletStates.Funded({ adjudicator });

  it('returns the adjudicator address', () => {
    expect(walletState.adjudicator).toEqual(adjudicator);
  });
});
