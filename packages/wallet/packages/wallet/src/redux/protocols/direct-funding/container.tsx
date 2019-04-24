import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import * as actions from '../../../redux/actions';
import { WalletProtocol } from '../../../redux/types';
import { unreachable } from '../../../utils/reducer-utils';
import { FundingStep } from './components/funding-step';
import * as directFundingStates from './state';
import { TransactionSubmission } from '../../protocols/transaction-submission/container';

interface Props {
  directFundingState: directFundingStates.DirectFundingState;
  fundingSuccessAcknowledged: () => void;
  fundingDeclinedAcknowledged: () => void;
  transactionRetryApprovedAction: (channelId: string, protocol: WalletProtocol) => void;
}

class DirectFundingContainer extends PureComponent<Props> {
  render() {
    const { directFundingState } = this.props;
    switch (directFundingState.type) {
      case directFundingStates.NOT_SAFE_TO_DEPOSIT:
      case directFundingStates.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP:
      case directFundingStates.FUNDING_SUCCESS:
        return <FundingStep directFundingState={directFundingState} />;
      case directFundingStates.WAIT_FOR_DEPOSIT_TRANSACTION:
        return (
          // TODO: how should we populate the transaction name?
          <TransactionSubmission
            state={directFundingState.transactionSubmissionState}
            transactionName={'direct deposit'}
          />
        );
      case directFundingStates.FUNDING_FAILURE:
        // todo: restrict the container to non-terminal states
        return <div>This shouldn't ever get shown.</div>;
      default:
        return unreachable(directFundingState);
    }
  }
}

const mapDispatchToProps = {
  fundingApproved: actions.channel.fundingApproved,
  fundingRejected: actions.channel.fundingRejected,
  fundingSuccessAcknowledged: actions.channel.fundingSuccessAcknowledged,
  fundingDeclinedAcknowledged: actions.channel.fundingDeclinedAcknowledged,
  transactionRetryApprovedAction: actions.transactionRetryApproved,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  () => ({}),
  mapDispatchToProps,
)(DirectFundingContainer);
