import React from 'react';

import { SiteState } from '../../redux/reducer';
import { connect } from 'react-redux';
import * as playerActions from '../redux/actions/player';
import * as challengeActions from '../redux/actions/challenge';
import * as blockchainActions from '../redux/actions/blockchain';
import { WalletState } from '../redux/reducers';


import * as playerA from '../wallet-engine/wallet-states/PlayerA';
import * as playerB from '../wallet-engine/wallet-states/PlayerB';
import * as CommonState from '../wallet-engine/wallet-states';
import { FundingFailed, WaitForApproval, SelectWithdrawalAddress, WaitForWithdrawal, ChallengeRequested, WaitForChallengeConcludeOrExpire, Funded, ConfirmWithdrawal, } from '../wallet-engine/wallet-states';

import FundingInProgress, { BlockchainStatus } from '../components/FundingInProgress';
import FundingError from '../components/FundingError';

import ChallengeResponse from '../components/ChallengeResponse';
import WalletWelcome from '../components/WalletWelcome';
import WalletWithdrawalWelcome from '../components/WalletWithdrawalWelcome';
import WithdrawInProgress from '../components/WithdrawInProgress';
import ChallengeExpired from '../components/ChallengeExpired';
import ChallengeIssued from '../components/ChallengeIssued';
import WaitForChallengeConfirmation from '../components/WaitForChallengeConfirmation';
import WaitForResponseConfirmation from '../components/WaitForResponseConfirmation';

import { ChallengeStatus, Signature, ConclusionProof } from '../domain';

interface Props {
  state: WalletState;
  userAddress: string;
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


function WalletContainer(props: Props) {
    const { state, closeWallet, approveWithdrawal } = props;
    const { channelState, challenge: challengeState } = state;

    if (channelState === null) {
      return <div />;
    }

    if (challengeState != null) {
      if (challengeState.status === ChallengeStatus.Expired) {
        return <ChallengeExpired withdraw={()=>props.withdraw(props.userAddress)} expiryTime={challengeState.expirationTime} />;
      } else {
        switch (challengeState.status) {
          case ChallengeStatus.WaitingForUserSelection:
            return (
              <ChallengeResponse
                expiryTime={challengeState.expirationTime}
                responseOptions={challengeState.responseOptions}
                respondWithMove={props.respondWithMove}
                respondWithAlternativeMove={props.respondWithAlternativeMove}
                refute={props.refute}
                conclude={props.conclude}
              />
            );
          case ChallengeStatus.WaitingOnOtherPlayer:
            return <ChallengeIssued expirationTime={challengeState.expirationTime} />;
          case ChallengeStatus.WaitingForCreateChallenge:
            return <WaitForChallengeConfirmation />;
          case ChallengeStatus.WaitingForConcludeChallenge:
            return <WaitForResponseConfirmation />;
        }
      }
    }

    switch (channelState && channelState.constructor) {
      case FundingFailed:
        // TODO: Figure out why we have to do this
        if (channelState instanceof FundingFailed) {
          return (
            <FundingError
              message={(channelState as FundingFailed).message}
              tryAgain={props.tryFundingAgain}
            />
          );
        }
      case CommonState.WithdrawalComplete:
        return <WithdrawInProgress
          withdrawStatus={BlockchainStatus.Completed}
          amount={(channelState as CommonState.WithdrawalComplete).withdrawalAmount}
          exitGame={closeWallet}
        />;
      case WaitForWithdrawal:
        return <WithdrawInProgress
          withdrawStatus={BlockchainStatus.InProgress}
          amount={(channelState as CommonState.WaitForWithdrawal).withdrawalAmount}
        />;
      case SelectWithdrawalAddress:
        return <WithdrawInProgress
          withdrawStatus={BlockchainStatus.NotStarted}
          amount={(channelState as CommonState.SelectWithdrawalAddress).withdrawalAmount}
        />;
      case ConfirmWithdrawal:
        return <WalletWithdrawalWelcome approve={approveWithdrawal} />;
      case ChallengeRequested:
        return <div>Waiting for challenge</div>;
      case WaitForChallengeConcludeOrExpire:
        return <div>Waiting for opponent to respond to challenge</div>;
      case playerA.ReadyToDeploy:
        return <FundingInProgress
          deployStatus={BlockchainStatus.NotStarted}
          depositStatus={BlockchainStatus.NotStarted}
          player={0}
          amount={(channelState as playerA.WaitForBlockchainDeploy).myBalance}
        />;
      case playerA.Funded:
        return <FundingInProgress
          deployStatus={BlockchainStatus.Completed}
          depositStatus={BlockchainStatus.Completed}
          player={0}
          amount={(channelState as Funded).myBalance}
          returnToGame={closeWallet}
        />;
      case playerB.Funded:
        return <FundingInProgress
          deployStatus={BlockchainStatus.Completed}
          depositStatus={BlockchainStatus.Completed}
          player={1}
          amount={(channelState as Funded).myBalance}
          returnToGame={closeWallet}

        />;
      case playerA.WaitForBlockchainDeploy:
        return <FundingInProgress
          deployStatus={BlockchainStatus.InProgress}
          depositStatus={BlockchainStatus.NotStarted}
          player={0}
          amount={(channelState as playerA.WaitForBlockchainDeploy).myBalance}
        />;
      case playerA.WaitForBToDeposit:
        return <FundingInProgress
          deployStatus={BlockchainStatus.Completed}
          depositStatus={BlockchainStatus.InProgress}
          player={0}
          amount={(channelState as playerA.WaitForBlockchainDeploy).myBalance}
        />;
      case playerB.WaitForAToDeploy:
        return <FundingInProgress
          deployStatus={BlockchainStatus.NotStarted}
          depositStatus={BlockchainStatus.NotStarted}
          player={1}
          amount={(channelState as playerA.WaitForBlockchainDeploy).myBalance}
        />;
      case playerB.ReadyToDeposit:
        return <FundingInProgress
          deployStatus={BlockchainStatus.Completed}
          depositStatus={BlockchainStatus.NotStarted}
          player={1}
          amount={(channelState as playerA.WaitForBlockchainDeploy).myBalance}
        />;
      case playerB.WaitForBlockchainDeposit:
        return <FundingInProgress
          deployStatus={BlockchainStatus.Completed}
          depositStatus={BlockchainStatus.InProgress}
          player={1}
          amount={(channelState as playerA.WaitForBlockchainDeploy).myBalance}
        />;
      case WaitForApproval:
      case playerB.WaitForApprovalWithAdjudicator:
        return <WalletWelcome
          approve={props.approveFunding} />;
      default:
        return <div />;
    }
    return <div />;
}

const mapStateToProps = (state: SiteState) => {
  return {
    state: state.wallet,
    userAddress: state.wallet.address || "",
    // TODO: We should store this in the wallet state and get it from there
  };
};

const mapDispatchToProps = {
  tryFundingAgain: playerActions.tryFundingAgain,
  approveFunding: playerActions.approveFunding,
  declineFunding: playerActions.declineFunding,
  approveWithdrawal: playerActions.approveWithdrawal,
  closeWallet: playerActions.closeWallet,
  selectWithdrawalAddress: playerActions.selectWithdrawalAddress,
  respondWithMove: challengeActions.respondWithMove,
  respondWithAlternativeMove: challengeActions.respondWithAlternativeMove,
  refute: challengeActions.refute,
  conclude: challengeActions.conclude,
  withdraw: blockchainActions.withdrawRequest,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(WalletContainer);
