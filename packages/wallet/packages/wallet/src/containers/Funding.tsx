import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as states from '../states';
import * as actions from '../redux/actions';

import BWaitForPostFundSetup from '../components/funding/BWaitForPostFundSetup';
import AWaitForPostFundSetup from '../components/funding/AWaitForPostFundSetup';
import AcknowledgeX from '../components/AcknowledgeX';
import WaitForXInitiation from '../components/WaitForXInitiation';
import WaitForXConfirmation from '../components/WaitForXConfirmation';
import SubmitX from '../components/SubmitX';
import ApproveX from '../components/ApproveX';
import { unreachable } from '../utils/reducer-utils';
import WaitForOtherPlayer from '../components/WaitForOtherPlayer';

interface Props {
  state: states.FundingState;
  fundingApproved: () => void;
  fundingRejected: () => void;
  fundingSuccessAcknowledged: () => void;
}

class FundingContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      fundingApproved,
      fundingRejected,
      fundingSuccessAcknowledged,
    } = this.props;

    switch (state.type) {
      case states.WAIT_FOR_FUNDING_REQUEST:
        return null;
      case states.APPROVE_FUNDING:
        return (
          <ApproveX
            title="Fund your channel!"
            description="Do you wish to open this channel?"
            approvalAction={fundingApproved}
            rejectionAction={fundingRejected}
          />
        );
      case states.A_WAIT_FOR_DEPLOY_TO_BE_SENT_TO_METAMASK:
        return <WaitForXInitiation name="deploy" />;
      case states.A_SUBMIT_DEPLOY_IN_METAMASK:
        return <SubmitX name="deploy" />;
      case states.WAIT_FOR_DEPLOY_CONFIRMATION:
        return <WaitForXConfirmation name="deploy" />;
      case states.A_WAIT_FOR_DEPOSIT:
        return <WaitForOtherPlayer name="deposit" />;
      case states.A_WAIT_FOR_POST_FUND_SETUP:
        return <AWaitForPostFundSetup />;
      case states.B_WAIT_FOR_DEPLOY_ADDRESS:
        return <WaitForOtherPlayer name="deployment" />;
      case states.B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK:
        return <SubmitX name="deposit" />;
      case states.B_SUBMIT_DEPOSIT_IN_METAMASK:
        return <WaitForXInitiation name="deposit" />;
      case states.WAIT_FOR_DEPOSIT_CONFIRMATION:
        if (state.ourIndex === 0) {
          return <WaitForOtherPlayer name="deposit" />;
        } else {
          return <WaitForXConfirmation name="deposit" />;
        }
      case states.B_WAIT_FOR_POST_FUND_SETUP:
        return <BWaitForPostFundSetup />;

      case states.ACKNOWLEDGE_FUNDING_SUCCESS:
        return (
          <AcknowledgeX
            title="Funding successful!"
            action={fundingSuccessAcknowledged}
            description="You have successfully deposited funds into your channel"
            actionTitle="Return to game"
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  fundingApproved: actions.fundingApproved,
  fundingRejected: actions.fundingRejected,
  fundingSuccessAcknowledged: actions.fundingSuccessAcknowledged,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  () => ({}),
  mapDispatchToProps,
)(FundingContainer);
