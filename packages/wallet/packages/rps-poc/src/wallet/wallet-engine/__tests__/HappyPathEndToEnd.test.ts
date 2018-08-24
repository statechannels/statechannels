import { Wallet } from '../..';
import WalletEngineA from '../WalletEngineA';
import * as WalletStatesA from '../wallet-states/PlayerA';
import * as WalletStatesB from '../wallet-states/PlayerB';
import WalletEngineB from '../WalletEngineB';

describe('Happy path runthrough', () => {
  const wallet: Wallet = {
    privateKey: 'privateKey',
    address: 'address',
    sign: (stateString: string) => stateString,
  };

  const transactionA = 'transactionA';
  const transactionB = 'transactionA';
  const adjudicator = 'adjudicator';
  // In A's application
  const walletEngineA = WalletEngineA.setupWalletEngine(wallet, transactionA);
  const readyToDeploy = walletEngineA.state;
  it('should have the ready to deploy state', () => {
    expect(readyToDeploy).toBeInstanceOf(WalletStatesA.ReadyToDeploy);
    expect(readyToDeploy.transaction).toEqual(transactionA);
  });

  // In B's application
  const walletEngineB = WalletEngineB.setupWalletEngine(wallet, transactionB);

  it('should have the wait for A to deploy state', () => {
    const waitForAToDeploy = walletEngineB.state;
    expect(waitForAToDeploy).toBeInstanceOf(WalletStatesB.WaitForAToDeploy);
    expect(waitForAToDeploy.transaction).toEqual(transactionB);
  });

  // In A's application
  it('should have the wait for blockchain to deploy state', () => {
    const waitForBlockchainToDeploy = walletEngineA.transactionSent();
    expect(waitForBlockchainToDeploy).toBeInstanceOf(WalletStatesA.WaitForBlockchainDeploy);
  });

  it('should have the wait for B to deposit state', () => {
    const waitForBToDeposit = walletEngineA.receiveEvent({ adjudicator });
    expect(waitForBToDeposit).toBeInstanceOf(WalletStatesA.WaitForBToDeposit);
    expect((waitForBToDeposit as WalletStatesA.WaitForBToDeposit).adjudicator).toEqual(adjudicator);
  });

  // In B's application

  it('should have the ready to deposit state', () => {
    const readyToDeposit = walletEngineB.receiveEvent({ adjudicator });
    expect(readyToDeposit).toBeInstanceOf(WalletStatesB.ReadyToDeposit);
    expect((readyToDeposit as WalletStatesB.ReadyToDeposit).transaction).toEqual(transactionB);
  });

  it('should have the wait for blockchain deploy state', () => {
    const waitForBlockchainDeposit = walletEngineB.transactionSent();
    expect(waitForBlockchainDeposit).toBeInstanceOf(WalletStatesB.WaitForBlockchainDeposit);
    expect(waitForBlockchainDeposit.adjudicator).toEqual(adjudicator);
  });

  // In A's application
  it('should have the funded state', () => {
    const funded = walletEngineA.receiveEvent({});
    expect(funded).toBeInstanceOf(WalletStatesA.Funded);
  });

  // In B's application
  it('should have the funded state', () => {
    const funded = walletEngineB.receiveEvent({});
    expect(funded).toBeInstanceOf(WalletStatesB.Funded);
  });
});
