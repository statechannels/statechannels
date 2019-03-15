import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { Button } from 'reactstrap';

import * as channelStates from '../redux/states/channels';
import * as actions from '../redux/actions';

import AcknowledgeX from '../components/AcknowledgeX';
import { unreachable } from '../utils/reducer-utils';
import TransactionFailed from '../components/TransactionFailed';
import ApproveFunding from '../components/funding/ApproveFunding';
import { AFundingStep, BFundingStep } from '../components/funding/FundingStep';
import EtherscanLink from '../components/EtherscanLink';

interface Props {
  state: channelStates.FundingState;
  fundingApproved: () => void;
  fundingRejected: () => void;
  fundingSuccessAcknowledged: () => void;
  fundingDeclinedAcknowledged: () => void;
  retryTransactionAction: () => void;
}

class FundingContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      fundingApproved,
      fundingRejected,
      fundingSuccessAcknowledged,
      fundingDeclinedAcknowledged,
      retryTransactionAction,
    } = this.props;

    switch (state.type) {
      case channelStates.WAIT_FOR_FUNDING_REQUEST:
        return null;
      case channelStates.APPROVE_FUNDING:
        return (
          <ApproveFunding
            fundingApproved={fundingApproved}
            fundingRejected={fundingRejected}
            requestedTotalFunds={state.requestedTotalFunds}
            requestedYourDeposit={state.requestedYourDeposit}
          />
        );
      case channelStates.A_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK:
        return <AFundingStep step={0} />;
      case channelStates.A_SUBMIT_DEPOSIT_IN_METAMASK:
        return <AFundingStep step={1}>Please confirm the transaction in MetaMask!</AFundingStep>;
      case channelStates.A_WAIT_FOR_DEPOSIT_CONFIRMATION:
        return (
          <AFundingStep step={2}>
            Check the progress on&nbsp;
            <EtherscanLink
              transactionID={state.transactionHash}
              networkId={-1} // TODO: Fix network id
              title="Etherscan"
            />
            !
          </AFundingStep>
        );
      case channelStates.A_WAIT_FOR_OPPONENT_DEPOSIT:
        return <AFundingStep step={3} />;
      case channelStates.A_WAIT_FOR_POST_FUND_SETUP:
        // return <AWaitForPostFundSetup />;
        return <AFundingStep step={4}>Waiting for the other player</AFundingStep>;
      case channelStates.B_WAIT_FOR_OPPONENT_DEPOSIT:
        // return <WaitForOtherPlayer name="deployment" />;
        return <BFundingStep step={1} />;
      case channelStates.B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK:
        // return <SubmitX name="deposit" />;
        return <BFundingStep step={2} />;
      case channelStates.B_SUBMIT_DEPOSIT_IN_METAMASK:
        // return <WaitForXInitiation name="deposit" />;
        return <BFundingStep step={2}> Please confirm the transaction in MetaMask!</BFundingStep>;
      case channelStates.B_WAIT_FOR_DEPOSIT_CONFIRMATION:
        if (state.ourIndex === 0) {
          return <AFundingStep step={3} />;
        } else {
          // return <WaitForXConfirmation name="deposit" transactionID={state.transactionHash} networkId={state.networkId} />;
          return (
            <BFundingStep step={3}>
              Check the progress on&nbsp;
              <EtherscanLink
                transactionID={state.transactionHash}
                networkId={-1} // TODO: Fix the network id
                title="Etherscan"
              />
              !
            </BFundingStep>
          );
        }
      case channelStates.B_WAIT_FOR_POST_FUND_SETUP:
        // return <BWaitForPostFundSetup />;
        return <BFundingStep step={4}>Waiting for the other player</BFundingStep>;

      case channelStates.ACKNOWLEDGE_FUNDING_SUCCESS:
        if (state.ourIndex === 0) {
          return (
            <AFundingStep step={5}>
              <Button onClick={fundingSuccessAcknowledged}>{'Return to game'}</Button>
            </AFundingStep>
          );
        } else {
          return (
            <BFundingStep step={5}>
              <Button onClick={fundingSuccessAcknowledged}>{'Return to game'}</Button>
            </BFundingStep>
          );
        }
      // return (
      // <AcknowledgeX
      //   title="Funding successful"
      //   action={fundingSuccessAcknowledged}
      //   description="You have successfully deposited funds into your channel"
      //   actionTitle="Return to game"
      // />
      // );
      case channelStates.ACKNOWLEDGE_FUNDING_DECLINED:
        return (
          <AcknowledgeX
            title="Funding declined!"
            action={fundingDeclinedAcknowledged}
            description="Your opponent has declined to fund the game."
            actionTitle="Return to game"
          />
        );
      case channelStates.SEND_FUNDING_DECLINED_MESSAGE:
        return null;
      case channelStates.A_DEPOSIT_TRANSACTION_FAILED:
        return <TransactionFailed name="deposit" retryAction={retryTransactionAction} />;
      case channelStates.B_DEPOSIT_TRANSACTION_FAILED:
        return <TransactionFailed name="deposit" retryAction={retryTransactionAction} />;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  fundingApproved: actions.fundingApproved,
  fundingRejected: actions.fundingRejected,
  fundingSuccessAcknowledged: actions.fundingSuccessAcknowledged,
  fundingDeclinedAcknowledged: actions.fundingDeclinedAcknowledged,
  retryTransactionAction: actions.retryTransaction,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  () => ({}),
  mapDispatchToProps,
)(FundingContainer);
