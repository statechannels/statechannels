import WalletEngine from '../WalletEngine';
import { PlayerIndex } from '../wallet-states';
import * as WalletStatesA from '../wallet-states/PlayerA';
import * as WalletStatesB from '../wallet-states/PlayerB';
import BN from 'bn.js';

const engineArgs = {
  myAddress: 'me',
  opponentAddress: 'you',
  myBalance: new BN(5),
  opponentBalance: new BN(5),
  playerIndex: PlayerIndex.A,
};

describe('Happy path runthrough', () => {
  // In A's application
  const walletEngineA = (new WalletEngine()).setup(engineArgs);
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
    const waitForB = walletEngineA.deployConfirmed('');
    expect(waitForB).toBeInstanceOf(WalletStatesA.WaitForBToDeposit);
  });

  // In B's application
  engineArgs.playerIndex = PlayerIndex.B;
  const walletEngineB = (new WalletEngine()).setup(engineArgs);
  it('should have the wait for approval state', () => {
    const waitForApprovalB = walletEngineB.state;
    expect(waitForApprovalB).toBeInstanceOf(WalletStatesB.WaitForApproval);
  });

  it('should have the wait for A to deploy state', () => {
    const waitForAToDeploy =  walletEngineB.approve();
    expect(waitForAToDeploy).toBeInstanceOf(WalletStatesB.WaitForAToDeploy);
  });

  it('should have the ready to deposit state', () => {
    const readyToDeposit = walletEngineB.deployConfirmed('0x123');
    expect(readyToDeposit).toBeInstanceOf(WalletStatesB.ReadyToDeposit);
  });

  it('should have the wait for blockchain deposit state', () => {
    const waitForBlockchainDeposit = walletEngineB.transactionSent();
    expect(waitForBlockchainDeposit).toBeInstanceOf(WalletStatesB.WaitForBlockchainDeposit);
  });

  it('should have the funded state', () => {
    const funded = walletEngineB.fundingConfirmed('0x123');
    expect(funded).toBeInstanceOf(WalletStatesB.Funded);
  });

  // In A's application
  it('should have the funded state', () => {
    const fundedA = walletEngineA.receiveFundingEvent();
    expect(fundedA).toBeInstanceOf(WalletStatesA.Funded);
  });
});
