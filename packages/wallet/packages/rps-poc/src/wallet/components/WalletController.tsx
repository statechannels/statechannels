import React from 'react';
import { PureComponent } from 'react';

import { ChallengeStatus, Signature, ConclusionProof } from '../domain';

import * as playerA from '../wallet-engine/wallet-states/PlayerA';
import * as playerB from '../wallet-engine/wallet-states/PlayerB';
import { FundingFailed, WaitForApproval, SelectWithdrawalAddress, WaitForWithdrawal, ChallengeRequested, WaitForChallengeConcludeOrExpire, Funded, } from '../wallet-engine/wallet-states';

import { WalletState } from '../redux/reducers/wallet-state';
import { ChallengeState } from '../redux/reducers/challenge';

import FundingInProgress, { BlockchainStatus } from './FundingInProgress';
import FundingError from './FundingError';
import WithdrawFunds from './WithdrawFunds';
import ChallengeIssued from './ChallengeIssued';
import ChallengeResponse from './ChallengeResponse';
import WaitingForCreateChallenge from './WaitingForCreateChallenge';
import WaitingForConcludeChallenge from './WaitingForConcludeChallenge';
import Sidebar from 'react-sidebar';
import FundingWelcome from './FundingWelcome';

interface Props {
  showWallet: boolean;
  walletState: WalletState;
  challengeState: ChallengeState;
  loginDisplayName: string;
  closeWallet: () => void;
  tryFundingAgain: () => void;
  approveFunding: () => void;
  declineFunding: () => void;
  selectWithdrawalAddress: (address: string) => void;
  respondWithMove: () => void;
  respondWithAlternativeMove: (alternativePosition: string, alternativeSignature: Signature, response: string, responseSignature: Signature) => void;
  refute: (newerPosition: string, signature: Signature) => void;
  conclude: (proof: ConclusionProof) => void;
}

export default class WalletController extends PureComponent<Props> {
  renderWallet() {
    const { walletState, challengeState, loginDisplayName, closeWallet } = this.props;
    if (walletState === null) {
      return <div />;
    }

    if (challengeState != null) {
      switch (challengeState.status) {
        case ChallengeStatus.WaitingForUserSelection:
          return (<ChallengeResponse expiryTime={challengeState.expirationTime} responseOptions={challengeState.responseOptions} respondWithMove={this.props.respondWithMove} respondWithAlternativeMove={this.props.respondWithAlternativeMove} refute={this.props.refute} conclude={this.props.conclude} />);
        case ChallengeStatus.WaitingOnOtherPlayer:
          return (<ChallengeIssued expiryTime={challengeState.expirationTime} />);
        case ChallengeStatus.WaitingForCreateChallenge:
          return <WaitingForCreateChallenge />;
        case ChallengeStatus.WaitingForCreateChallenge:
          return <WaitingForCreateChallenge />;
        case ChallengeStatus.WaitingForConcludeChallenge:
          return <WaitingForConcludeChallenge />;
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
        break;
      case WaitForWithdrawal:
        return <div>Waiting for withdrawal process to complete.</div>;
        break;
      case SelectWithdrawalAddress:
        return <WithdrawFunds selectAddress={this.props.selectWithdrawalAddress} />;
        break;
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
        break;
      case playerA.Funded:
        return <FundingInProgress
          loginDisplayName={loginDisplayName}
          deployStatus={BlockchainStatus.Completed}
          depositStatus={BlockchainStatus.Completed}
          player={0}
          amount={(walletState as Funded).myBalance}
          returnToGame={closeWallet}
        />;
        break;
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
          depositStatus={BlockchainStatus.NotStarted}
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

        return <FundingWelcome approve={this.props.approveFunding} decline={this.props.declineFunding} />;
      default:
        return <div />;
    }
    return <div />;
  }

  render() {
    return <Sidebar
      sidebar={this.renderWallet()}
      open={this.props.showWallet}
      styles={{ sidebar: { width: "30%", background: "#f3f3f3" } }}
    >
      {this.props.children}
    </Sidebar>;
  }
}
