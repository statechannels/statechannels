import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as fundingStates from '../redux/channelState/fundingState/state';
import * as actions from '../redux/actions';

import { unreachable } from '../utils/reducer-utils';
import TransactionFailed from '../components/TransactionFailed';
import ApproveFunding from '../components/funding/ApproveFunding';
import { AFundingStep, BFundingStep } from '../components/funding/FundingStep';
import EtherscanLink from '../components/EtherscanLink';

interface Props {
  state: fundingStates.FundingState;
  fundingApproved: () => void;
  fundingRejected: () => void;
  fundingSuccessAcknowledged: () => void;
  fundingDeclinedAcknowledged: () => void;
  retryTransactionAction: () => void;
}

class DirectFundingContainer extends PureComponent<Props> {
  render() {
    const { state, fundingApproved, fundingRejected, retryTransactionAction } = this.props;

    switch (state.type) {
      case fundingStates.WAIT_FOR_FUNDING_REQUEST:
        return null;
      case fundingStates.WAIT_FOR_FUNDING_APPROVAL:
        return (
          <ApproveFunding
            fundingApproved={fundingApproved}
            fundingRejected={fundingRejected}
            requestedTotalFunds={state.requestedTotalFunds}
            requestedYourContribution={state.requestedYourContribution}
          />
        );

      // PlayerA
      case fundingStates.A_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK:
        return <AFundingStep step={0} />;
      case fundingStates.A_SUBMIT_DEPOSIT_IN_METAMASK:
        return <AFundingStep step={1}>Please confirm the transaction in MetaMask!</AFundingStep>;
      case fundingStates.A_WAIT_FOR_DEPOSIT_CONFIRMATION:
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
      case fundingStates.A_WAIT_FOR_OPPONENT_DEPOSIT:
        return <AFundingStep step={3} />;

      // PlayerB
      case fundingStates.B_WAIT_FOR_OPPONENT_DEPOSIT:
        return <BFundingStep step={1} />;
      case fundingStates.B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK:
        return <BFundingStep step={2} />;
      case fundingStates.B_SUBMIT_DEPOSIT_IN_METAMASK:
        return <BFundingStep step={2}> Please confirm the transaction in MetaMask!</BFundingStep>;
      case fundingStates.B_WAIT_FOR_DEPOSIT_CONFIRMATION:
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
      case fundingStates.A_DEPOSIT_TRANSACTION_FAILED:
        return <TransactionFailed name="deposit" retryAction={retryTransactionAction} />;
      case fundingStates.B_DEPOSIT_TRANSACTION_FAILED:
        return <TransactionFailed name="deposit" retryAction={retryTransactionAction} />;
      case fundingStates.FUNDING_CONFIRMED:
        return null;
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
)(DirectFundingContainer);
