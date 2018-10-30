import React from 'react';
import { PureComponent } from 'react';

import { ChallengeStatus, Signature, ConclusionProof } from '../domain';

import * as playerA from '../wallet-engine/wallet-states/PlayerA';
import * as playerB from '../wallet-engine/wallet-states/PlayerB';
import * as CommonState from '../wallet-engine/wallet-states';
import { FundingFailed, WaitForApproval, SelectWithdrawalAddress, WaitForWithdrawal, ChallengeRequested, WaitForChallengeConcludeOrExpire, Funded, ConfirmWithdrawal, } from '../wallet-engine/wallet-states';

import { WalletState } from '../redux/reducers/wallet-state';
import { ChallengeState } from '../redux/reducers/challenge';

import FundingInProgress, { BlockchainStatus } from './FundingInProgress';
import FundingError from './FundingError';

import ChallengeResponse from './ChallengeResponse';
import Sidebar from 'react-sidebar';
import WalletWelcome from './WalletWelcome';
import WalletWithdrawalWelcome from './WalletWithdrawalWelcome';
import WithdrawInProgress from './WithdrawInProgress';
import WalletMessage from './WalletMessage';
import ChallengeExpired from './ChallengeExpired';

interface Props {
  showWallet: boolean;
  walletState: WalletState;
  challengeState: ChallengeState;
  loginDisplayName: string;
  userAddress:string;
  closeWallet: () => void;
  tryFundingAgain: () => void;
  approveFunding: () => void;
  approveWithdrawal: () => void;
  declineFunding: () => void;
  selectWithdrawalAddress: (address: string) => void;
  respondWithMove: () => void;
  respondWithAlternativeMove: (alternativePosition: string, alternativeSignature: Signature, response: string, responseSignature: Signature) => void;
  refute: (newerPosition: string, signature: Signature) => void;
  conclude: (proof: ConclusionProof) => void;
  withdraw: (address:string) => void;
}
export default class WalletController extends PureComponent<Props> {
  renderWallet() {
    const { walletState, challengeState, loginDisplayName, closeWallet, approveWithdrawal } = this.props;
    if (walletState === null) {
      return <div />;
    }

    if (challengeState != null) {
      if (challengeState.status === ChallengeStatus.Expired) {
        return <ChallengeExpired withdraw={()=>this.props.withdraw(this.props.userAddress)} loginDisplayName={loginDisplayName} expiryTime={challengeState.expirationTime} />;
      } else {
        switch (challengeState.status) {
          case ChallengeStatus.WaitingForUserSelection:
            return (<ChallengeResponse loginDisplayName={loginDisplayName} expiryTime={challengeState.expirationTime} responseOptions={challengeState.responseOptions} respondWithMove={this.props.respondWithMove} respondWithAlternativeMove={this.props.respondWithAlternativeMove} refute={this.props.refute} conclude={this.props.conclude} />);
          case ChallengeStatus.WaitingOnOtherPlayer:
            const parsedExpiryDateTime = new Date(challengeState.expirationTime * 1000).toLocaleTimeString();
            const waitForPlayerContent = <div><p>Your challenge has been issued.</p>
              <p>The game will automatically conclude by {parsedExpiryDateTime} if no action is taken.</p></div>;
            return (<WalletMessage loginDisplayName={loginDisplayName} content={waitForPlayerContent} title="Challenge Issued" />);
          case ChallengeStatus.WaitingForCreateChallenge:
            const waitForCreateContent = <div>Waiting for the challenge transaction to be recorded.</div>;
            return <WalletMessage loginDisplayName={loginDisplayName} title="Waiting for challenge creation" content={waitForCreateContent} />;
          case ChallengeStatus.WaitingForConcludeChallenge:
            const waitForConcludeContent = <div>Waiting for the challenge to conclude</div>;
            return <WalletMessage loginDisplayName={loginDisplayName} title="Waiting for challenge to conclude" content={waitForConcludeContent} />;
        }
      }
    }

    switch (walletState && walletState.constructor) {
      case FundingFailed:
        // TODO: Figure out why we have to do this
        if (walletState instanceof FundingFailed) {
          return (
            <FundingError
              message={(walletState as FundingFailed).message}
              tryAgain={this.props.tryFundingAgain}
            />
          );
        }
      case CommonState.WithdrawalComplete:
        return <WithdrawInProgress
          loginDisplayName={loginDisplayName}
          withdrawStatus={BlockchainStatus.Completed}
          amount={(walletState as CommonState.WithdrawalComplete).withdrawalAmount}
          exitGame={closeWallet}
        />;
      case WaitForWithdrawal:
        return <WithdrawInProgress
          loginDisplayName={loginDisplayName}
          withdrawStatus={BlockchainStatus.InProgress}
          amount={(walletState as CommonState.WaitForWithdrawal).withdrawalAmount}
        />;
      case SelectWithdrawalAddress:
        return <WithdrawInProgress
          loginDisplayName={loginDisplayName}
          withdrawStatus={BlockchainStatus.NotStarted}
          amount={(walletState as CommonState.SelectWithdrawalAddress).withdrawalAmount}
        />;
      case ConfirmWithdrawal:
        const withdrawalContent = <div><p>This State Stash wallet enables you to quickly withdraw your funds.</p>
          <p>We’ll guide you through a few simple steps to get it setup and your ETH transferred.</p></div>;
        return <WalletWithdrawalWelcome
          title="Withdraw with the State Stash Wallet"
          content={withdrawalContent}
          approve={approveWithdrawal}
        />;
      case ChallengeRequested:
        return <div>Waiting for challenge</div>;
      case WaitForChallengeConcludeOrExpire:
        return <div>Waiting for opponent to respond to challenge</div>;
      case playerA.ReadyToDeploy:
        return <FundingInProgress
          loginDisplayName={loginDisplayName}
          deployStatus={BlockchainStatus.NotStarted}
          depositStatus={BlockchainStatus.NotStarted}
          player={0}
          amount={(walletState as playerA.WaitForBlockchainDeploy).myBalance}
        />;
      case playerA.Funded:
        return <FundingInProgress
          loginDisplayName={loginDisplayName}
          deployStatus={BlockchainStatus.Completed}
          depositStatus={BlockchainStatus.Completed}
          player={0}
          amount={(walletState as Funded).myBalance}
          returnToGame={closeWallet}
        />;
      case playerB.Funded:
        return <FundingInProgress
          loginDisplayName={loginDisplayName}
          deployStatus={BlockchainStatus.Completed}
          depositStatus={BlockchainStatus.Completed}
          player={1}
          amount={(walletState as Funded).myBalance}
          returnToGame={closeWallet}

        />;
      case playerA.WaitForBlockchainDeploy:
        return <FundingInProgress
          loginDisplayName={loginDisplayName}
          deployStatus={BlockchainStatus.InProgress}
          depositStatus={BlockchainStatus.NotStarted}
          player={0}
          amount={(walletState as playerA.WaitForBlockchainDeploy).myBalance}
        />;
      case playerA.WaitForBToDeposit:
        return <FundingInProgress
          loginDisplayName={loginDisplayName}
          deployStatus={BlockchainStatus.Completed}
          depositStatus={BlockchainStatus.InProgress}
          player={0}
          amount={(walletState as playerA.WaitForBlockchainDeploy).myBalance}
        />;
      case playerB.WaitForAToDeploy:
        return <FundingInProgress
          loginDisplayName={loginDisplayName}
          deployStatus={BlockchainStatus.NotStarted}
          depositStatus={BlockchainStatus.NotStarted}
          player={1}
          amount={(walletState as playerA.WaitForBlockchainDeploy).myBalance}
        />;
      case playerB.ReadyToDeposit:
        return <FundingInProgress
          loginDisplayName={loginDisplayName}
          deployStatus={BlockchainStatus.Completed}
          depositStatus={BlockchainStatus.NotStarted}
          player={1}
          amount={(walletState as playerA.WaitForBlockchainDeploy).myBalance}
        />;
      case playerB.WaitForBlockchainDeposit:
        return <FundingInProgress
          loginDisplayName={loginDisplayName}
          deployStatus={BlockchainStatus.Completed}
          depositStatus={BlockchainStatus.InProgress}
          player={1}
          amount={(walletState as playerA.WaitForBlockchainDeploy).myBalance}
        />;
      case WaitForApproval:
      case playerB.WaitForApprovalWithAdjudicator:
        return <WalletWelcome
          approve={this.props.approveFunding} />;
      default:
        return <div />;
    }
    return <div />;
  }

  render() {
    return <Sidebar
      sidebar={this.renderWallet()}
      open={this.props.showWallet}
      styles={{ sidebar: { width: "450px", zIndex: "1040", background: "#f3f3f3" } }}
      overlayClassName="wallet-overlay"
    >
      {this.props.children}
    </Sidebar>;
  }
}
