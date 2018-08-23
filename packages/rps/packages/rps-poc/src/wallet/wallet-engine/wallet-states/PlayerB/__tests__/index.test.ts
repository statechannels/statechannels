import * as WalletStates from '..';

describe('WaitForAToDeploy', () => {
  const walletState = new WalletStates.WaitForAToDeploy();
  it('is not ready to send', () => {
    expect(walletState.isReadyToSend).toBe(false);
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
});
describe('WaitForBlockchainDeposit', () => {
  const adjudicator = 'address';
  const walletState = new WalletStates.WaitForBlockchainDeposit({ adjudicator });
  it('returns the address of the adjudicator', () => {
    expect(walletState.adjudicator).toEqual(adjudicator);
  });
});
