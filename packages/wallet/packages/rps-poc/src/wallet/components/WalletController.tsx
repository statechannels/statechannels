import React from 'react';
import { PureComponent } from 'react';

import { ChallengeStatus, Signature, ConclusionProof } from '../domain';

import * as playerA from '../wallet-engine/wallet-states/PlayerA';
import * as playerB from '../wallet-engine/wallet-states/PlayerB';
import { FundingFailed, WaitForApproval, SelectWithdrawalAddress, WaitForWithdrawal, ChallengeRequested, WaitForChallengeConcludeOrExpire } from '../wallet-engine/wallet-states';

import { WalletState } from '../redux/reducers/wallet-state';
import { ChallengeState } from '../redux/reducers/challenge';

import FundingInProgress from './FundingInProgress';
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
    const { walletState, challengeState } = this.props;
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
        return (
          <FundingError
            message={(walletState as FundingFailed).message}
            tryAgain={this.props.tryFundingAgain}
          />
        );
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
      case playerA.WaitForBlockchainDeploy:
        return <FundingInProgress message="confirmation of adjudicator deployment" />;

      case playerA.WaitForBToDeposit:
        return <FundingInProgress message="confirmation of adjudicator deployment" />;

      case playerB.WaitForAToDeploy:
        return <FundingInProgress message="waiting for adjudicator to be deployed" />;

      case playerB.ReadyToDeposit:
        return <FundingInProgress message="ready to deposit funds" />;

      case playerB.WaitForBlockchainDeposit:
        return <FundingInProgress message="waiting for deposit confirmation" />;
      case WaitForApproval:
      case playerB.WaitForApprovalWithAdjudicator:

        return <FundingWelcome approve={this.props.approveFunding} decline={this.props.declineFunding} />;
      default:
        if (!walletState) {
          return <div />;
        }
        return (
          <FundingInProgress message={`[view not implemented: ${walletState.constructor.name}`} />
        );
    }
  }

  render() {
    return <Sidebar
      sidebar={this.renderWallet()}
      open={this.props.showWallet}
      styles={{ sidebar: { width: "35%", background: "#f3f3f3" } }}
    >
      {this.props.children}
    </Sidebar>;
  }
}
