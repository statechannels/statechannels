import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import ApproveFunding from '../../components/indirect-funding/approve-funding';
import { FundingStep, fundingStepByState } from '../../components/indirect-funding/funding-step';
import * as actions from '../../redux/indirect-funding/player-a/actions';
import * as indirectFundingPlayerB from '../../redux/indirect-funding/player-b/state';
import { unreachable } from '../../utils/reducer-utils';

interface Props {
  indirectFundingBState: indirectFundingPlayerB.PlayerBState;
  fundingApproved: (processId: string, consensusLibrary: string) => void;
  fundingRejected: (processId: string, consensusLibrary: string) => void;
}

class IndirectFundingBContainer extends PureComponent<Props> {
  render() {
    // TODO: where is the processId  stored?
    const processId = '123';
    // TODO: This should be mapped from state
    const consensusLibrary = '0x0123';
    const { indirectFundingBState, fundingApproved } = this.props;
    const step = fundingStepByState(indirectFundingBState);
    const processFundingApproved = () => fundingApproved(processId, consensusLibrary);
    const processFundingRejected = () => fundingApproved(processId, consensusLibrary);

    switch (indirectFundingBState.type) {
      case indirectFundingPlayerB.WAIT_FOR_APPROVAL:
        return (
          <ApproveFunding
            fundingApproved={processFundingApproved}
            fundingRejected={processFundingRejected}
            requestedTotalFunds={'1000000000000000'}
            requestedYourContribution={'500000000000000'}
          />
        );
      case indirectFundingPlayerB.WAIT_FOR_PRE_FUND_SETUP_0:
      case indirectFundingPlayerB.WAIT_FOR_POST_FUND_SETUP_0:
      case indirectFundingPlayerB.WAIT_FOR_LEDGER_UPDATE_0:
      case indirectFundingPlayerB.WAIT_FOR_CONSENSUS:
        return <FundingStep step={step} />;
      case indirectFundingPlayerB.WAIT_FOR_DIRECT_FUNDING:
        return <div />;
      // TODO: pass the relevant state to DirectFundingContainer
      // return <DirectFundingContainer />;
      default:
        return unreachable(indirectFundingBState);
    }
  }
}

const mapDispatchToProps = {
  // TODO: wire up the reject action
  fundingApproved: actions.strategyApproved,
  fundingRejected: actions.strategyApproved,
};

export default connect(
  () => ({}),
  mapDispatchToProps,
)(IndirectFundingBContainer);
