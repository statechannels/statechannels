import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import ApproveFunding from '../../components/indirect-funding/approve-funding';
import { FundingStep, fundingStepByState } from '../../components/indirect-funding/funding-step';
import * as actions from '../../redux/indirect-funding/player-a/actions';
import * as indirectFundingPlayerA from '../../redux/indirect-funding/player-a/state';
import { unreachable } from '../../utils/reducer-utils';

interface Props {
  indirectFundingAState: indirectFundingPlayerA.PlayerAState;
  fundingApproved: (processId: string, consensusLibrary: string) => void;
  fundingRejected: (processId: string, consensusLibrary: string) => void;
}

class IndirectFundingAContainer extends PureComponent<Props> {
  render() {
    // TODO: where is the processId  stored?
    const processId = '123';
    // TODO: This should be mapped from state
    const consensusLibrary = '0x0123';
    const { indirectFundingAState, fundingApproved } = this.props;
    const step = fundingStepByState(indirectFundingAState);
    const processFundingApproved = () => fundingApproved(processId, consensusLibrary);
    const processFundingRejected = () => fundingApproved(processId, consensusLibrary);

    switch (indirectFundingAState.type) {
      case indirectFundingPlayerA.WAIT_FOR_APPROVAL:
        return (
          <ApproveFunding
            fundingApproved={processFundingApproved}
            fundingRejected={processFundingRejected}
            requestedTotalFunds={'1000000000000000'}
            requestedYourContribution={'500000000000000'}
          />
        );
      case indirectFundingPlayerA.WAIT_FOR_PRE_FUND_SETUP_1:
      case indirectFundingPlayerA.WAIT_FOR_POST_FUND_SETUP_1:
      case indirectFundingPlayerA.WAIT_FOR_LEDGER_UPDATE_1:
        return <FundingStep step={step} />;
      case indirectFundingPlayerA.WAIT_FOR_DIRECT_FUNDING:
        // TODO: DirectFundingContainer relies on the shape of the direct funding process state
        // return <DirectFundingContainer state={indirectFundingAState.directFunding} />;
        return <div />;
      default:
        return unreachable(indirectFundingAState);
    }
  }
}

const mapDispatchToProps = {
  // TODO: wire up the reject action.
  fundingApproved: actions.strategyApproved,
  fundingRejected: actions.strategyApproved,
};

export default connect(
  () => ({}),
  mapDispatchToProps,
)(IndirectFundingAContainer);
