import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { NonTerminalTransactionSubmissionState } from './states';
import { unreachable } from '../../../utils/reducer-utils';
import WaitForConfirmation from './components/wait-for-confirmation';
import WaitForSubmission from './components/wait-for-submission';
import { NETWORK_ID } from '../../../constants';
import ApproveRetry from './components/approve-retry';
import * as actions from './actions';
import { ActionConstructor } from '../../utils';

interface Props {
  state: NonTerminalTransactionSubmissionState;
  transactionName: string;
  transactionRetryApproved: ActionConstructor<actions.TransactionRetryApproved>;
  transactionRetryDenied: ActionConstructor<actions.TransactionRetryDenied>;
}

class TransactionSubmissionContainer extends PureComponent<Props> {
  render() {
    const { state, transactionName, transactionRetryApproved, transactionRetryDenied } = this.props;
    switch (state.type) {
      case 'TransactionSubmission.WaitForSend':
      case 'TransactionSubmission.WaitForSubmission':
        return <WaitForSubmission name={transactionName} />;
      case 'TransactionSubmission.WaitForConfirmation':
        return (
          <WaitForConfirmation
            name={transactionName}
            transactionId={state.transactionHash}
            networkId={NETWORK_ID}
          />
        );
      case 'TransactionSubmission.ApproveRetry':
        const { processId } = state;
        return (
          <ApproveRetry
            name={transactionName}
            approve={() => transactionRetryApproved({ processId })}
            deny={() => transactionRetryDenied({ processId })}
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  transactionRetryApproved: actions.transactionRetryApproved,
  transactionRetryDenied: actions.transactionRetryDenied,
};

export const TransactionSubmission = connect(
  () => ({}),
  mapDispatchToProps,
)(TransactionSubmissionContainer);
