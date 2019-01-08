import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as states from '../states';
import * as actions from '../redux/actions';

import AcknowledgeX from '../components/AcknowledgeX';
import WaitForXConfirmation from '../components/WaitForXConfirmation';
import WaitForXInitiation from '../components/WaitForXInitiation';
import ApproveX from '../components/ApproveX';
import { unreachable } from '../utils/reducer-utils';

interface Props {
  state: states.WithdrawingState;
  withdrawalApproved: (destinationAddress: string) => void;
  withdrawalRejected: () => void;
  withdrawalSuccessAcknowledged: () => void;
}

class WithdrawingContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      withdrawalApproved,
      withdrawalRejected,
      withdrawalSuccessAcknowledged,
    } = this.props;

    switch (state.type) {
      case states.APPROVE_WITHDRAWAL:

        return (
          <ApproveX
            title="Withdraw your funds"
            description="Do you wish to withdraw your funds from this channel?"
            approvalAction={() => withdrawalApproved('todo address')}
            rejectionAction={withdrawalRejected}
          />
        );
      case states.WAIT_FOR_WITHDRAWAL_INITIATION:
        return <WaitForXInitiation name="withdrawal" />;
      case states.WAIT_FOR_WITHDRAWAL_CONFIRMATION:
        return <WaitForXConfirmation name="withdrawal" />;
      case states.ACKNOWLEDGE_WITHDRAWAL_SUCCESS:
        return (
          <AcknowledgeX
            title="Withdrawal successful!"
            description="You have successfully withdrawn your funds."
            action={withdrawalSuccessAcknowledged}
            actionTitle="Return to app"
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  withdrawalApproved: actions.withdrawalApproved,
  withdrawalRejected: actions.withdrawalRejected,
  withdrawalSuccessAcknowledged: actions.withdrawalSuccessAcknowledged,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  () => ({}),
  mapDispatchToProps,
)(WithdrawingContainer);
