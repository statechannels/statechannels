import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as states from '../states';
import * as actions from '../redux/actions';

import AcknowledgeX from '../components/AcknowledgeX';
import ApproveX from '../components/ApproveX';
import { unreachable } from '../utils/reducer-utils';
import WaitForOtherPlayer from '../components/WaitForOtherPlayer';
import WaitForXConfirmation from '../components/WaitForXConfirmation';
import WaitForXInitiation from '../components/WaitForXInitiation';
import TransactionFailed from '../components/TransactionFailed';
import SelectAddress from '../components/withdrawing/SelectAddress';

interface Props {
  state: states.ClosingState;
  concludeApproved: () => void;
  concludeRejected: () => void;
  closeOnChain: (withdrawAddress: string) => void;
  closeSuccessAcknowledged: () => void;
  closedOnChainAcknowledged: () => void;
  retryTransaction: () => void;
}

class ClosingContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      concludeApproved,
      concludeRejected,
      closeSuccessAcknowledged,
      closedOnChainAcknowledged,
      closeOnChain,
      retryTransaction,
    } = this.props;

    switch (state.type) {
      case states.APPROVE_CONCLUDE:
        return (
          <ApproveX
            title="Conclude the game!"
            description="Do you wish to conclude this game?"
            approvalAction={concludeApproved}
            rejectionAction={concludeRejected}
            yesMessage="Conclude"
            noMessage="Cancel"
          />
        );
      case states.WAIT_FOR_OPPONENT_CONCLUDE:
        return <WaitForOtherPlayer name="conclude" />;
      case states.APPROVE_CLOSE_ON_CHAIN:
        // TODO: Add option to reject closing the channel?  
        return (
          <SelectAddress
            approveAction={closeOnChain}
            title="Close and Withdraw"
            description="The game has been concluded! You can now close the channel and withdraw your funds."
            approveButtonTitle="Close and Withdraw" />
        );
      case states.ACKNOWLEDGE_CLOSE_SUCCESS:
        return (
          <AcknowledgeX
            title="Channel closed!"
            action={closeSuccessAcknowledged}
            description="You have successfully closed your channel"
            actionTitle="Ok!"
          />
        );
      case states.ACKNOWLEDGE_CLOSED_ON_CHAIN:
        return (
          <AcknowledgeX
            title="Channel closed on chain!"
            action={closedOnChainAcknowledged}
            description="You have successfully closed your channel on chain"
            actionTitle="Ok!"
          />
        );
      case states.WAIT_FOR_CLOSE_INITIATION:
        return <WaitForXInitiation name="close" />;
      case states.WAIT_FOR_CLOSE_SUBMISSION:
        return <WaitForXInitiation name="close" />;
      case states.WAIT_FOR_CLOSE_CONFIRMED:
        return <WaitForXConfirmation name="close" transactionID={state.transactionHash} networkId={state.networkId} />;
      case states.WAIT_FOR_OPPONENT_CLOSE:
        return <WaitForOtherPlayer name="close" />;
      case states.ACKNOWLEDGE_CONCLUDE:
        return (
          <AcknowledgeX
            title="Game Concluded!"
            action={concludeApproved}
            description="Your opponent has concluded the game!"
            actionTitle="Ok!"
          />
        );
      case states.CLOSE_TRANSACTION_FAILED:
        return <TransactionFailed name='conclude' retryAction={retryTransaction} />;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  concludeApproved: actions.concludeApproved,
  concludeRejected: actions.concludeRejected,
  closeSuccessAcknowledged: actions.closeSuccessAcknowledged,
  closedOnChainAcknowledged: actions.closedOnChainAcknowledged,
  closeOnChain: actions.approveClose,
  retryTransaction: actions.retryTransaction,
};

export default connect(
  () => ({}),
  mapDispatchToProps,
)(ClosingContainer);
