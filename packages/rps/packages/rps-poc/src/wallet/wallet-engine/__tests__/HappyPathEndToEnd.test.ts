
import WalletEngineA from '../WalletEngineA';
import * as WalletStatesA from '../wallet-states/PlayerA';
import * as WalletStatesB from '../wallet-states/PlayerB';
import WalletEngineB from '../WalletEngineB';

describe('Happy path runthrough', () => {


  // In A's application
  const walletEngineA = WalletEngineA.setupWalletEngine();
  const waitForApproval = walletEngineA.state;
  it('should have the wait for approval state', () => {
    expect(waitForApproval).toBeInstanceOf(WalletStatesA.WaitForApproval);
  });


  it('should have the ready to deploy state', () => {
    const readyToDeploy = walletEngineA.approve();
    expect(readyToDeploy).toBeInstanceOf(WalletStatesA.ReadyToDeploy);
  });

  it('should have the wait for blockchain to deploy state', () => {
    const waitForBlockchainToDeploy = walletEngineA.transactionSent();
    expect(waitForBlockchainToDeploy).toBeInstanceOf(WalletStatesA.WaitForBlockchainDeploy);
  });

  it('should have the wait for B to deposit state', () => {
    const waitForB = walletEngineA.transactionConfirmed('');
    expect(waitForB).toBeInstanceOf(WalletStatesA.WaitForBToDeposit);
  });

  // In B's application
  const walletEngineB = WalletEngineB.setupWalletEngine();

  it('should have the wait for A to deploy state', () => {
    const waitForAToDeploy = walletEngineB.state;
    expect(waitForAToDeploy).toBeInstanceOf(WalletStatesB.WaitForAToDeploy);
  });

  it('should have the ready to deposit state', () => {
    const readyToDeposit = walletEngineB.deployConfirmed('');
    expect(readyToDeposit).toBeInstanceOf(WalletStatesB.ReadyToDeposit);
  });

  it('should have the wait for blockchain deposit state', () => {
    const waitForBlockchainDeposit = walletEngineB.transactionSent();
    expect(waitForBlockchainDeposit).toBeInstanceOf(WalletStatesB.WaitForBlockchainDeposit);
  });

  it("should have the funded state",()=>{
    const funded = walletEngineB.transactionConfirmed();
    expect(funded).toBeInstanceOf(WalletStatesB.Funded);
  });

  // In A's application
  it('should have the funded state', () => {
    const fundedA = walletEngineA.receiveFundingEvent();
    expect(fundedA).toBeInstanceOf(WalletStatesA.Funded);
  });


});
