import * as WalletStates from '..';

describe('WaitForAToDeploy', () => {
  const transaction = 'bla';
  const walletState = new WalletStates.WaitForAToDeploy({ transaction });
  it('is not ready to send', () => {
    expect(walletState.isReadyToSend).toBe(false);
  });
  it('is not funded', () => {
    expect(walletState.isFunded).toBe(false);
  });
  it('stores the transaction in state', () => {
    expect(walletState.transaction).toEqual(transaction);
  });
});
describe('ReadyToDeposit', () => {
  const transaction = { some: 'transaction properties' };
  const adjudicator = 'address';
  const walletState = new WalletStates.ReadyToDeposit({ adjudicator, transaction });
  it('has a transaction', () => {
    expect(walletState.transaction).toEqual(transaction);
  });
  it('returns the address of the adjudicator', () => {
    expect(walletState.adjudicator).toEqual(adjudicator);
  });
  it('is ready to send', () => {
    expect(walletState.isReadyToSend).toBe(true);
  });
  it('is not funded', () => {
    expect(walletState.isFunded).toBe(false);
  });
});
describe('WaitForBlockchainDeposit', () => {
  const adjudicator = 'address';
  const walletState = new WalletStates.WaitForBlockchainDeposit({ adjudicator });
  it('returns the address of the adjudicator', () => {
    expect(walletState.adjudicator).toEqual(adjudicator);
  });
  it('is not ready to send', () => {
    expect(walletState.isReadyToSend).toBe(false);
  });
  it('is not funded', () => {
    expect(walletState.isFunded).toBe(false);
  });
});

describe('Funded', () => {
  const adjudicator = 'address';
  const walletState = new WalletStates.Funded({ adjudicator });
  it('is not ready to send', () => {
    expect(walletState.isReadyToSend).toBe(false);
  });
  it('is funded', () => {
    expect(walletState.isFunded).toBe(true);
  });
});
