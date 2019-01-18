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

interface Props {
  state: states.ClosingState;
  concludeApproved: () => void;
  concludeRejected: () => void;
  closeOnChain: () => void;
  closeSuccessAcknowledged: () => void;
  closedOnChainAcknowledged: () => void;
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
    } = this.props;

    switch (state.type) {
      case states.APPROVE_CONCLUDE:
        return (
          <ApproveX
            title="Conclude the game!"
            description="Do you wish to conclude this game?"
            approvalAction={concludeApproved}
            rejectionAction={concludeRejected}
          />
        );
      case states.WAIT_FOR_OPPONENT_CONCLUDE:
        return <WaitForOtherPlayer name="conclude" />;
      case states.APPROVE_CLOSE_ON_CHAIN:
        // TODO: Add option to reject closing the channel?  
        return (
          <AcknowledgeX
            title="Close Channel!"
            action={closeOnChain}
            description="The game has been concluded and the channel can now be closed."
            actionTitle="Close channel"
          />
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
        return <WaitForXConfirmation name="close" />;
      case states.WAIT_FOR_CLOSE_CONFIRMED:
        return <WaitForXConfirmation name="close" />;
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
};

export default connect(
  () => ({}),
  mapDispatchToProps,
)(ClosingContainer);
