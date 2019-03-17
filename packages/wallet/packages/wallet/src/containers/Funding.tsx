import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { Button } from 'reactstrap';

import * as channelStates from '../redux/channelState/state';
import * as actions from '../redux/actions';

import AcknowledgeX from '../components/AcknowledgeX';
import { unreachable } from '../utils/reducer-utils';
import ApproveFunding from '../components/funding/ApproveFunding';
import { AFundingStep, BFundingStep } from '../components/funding/FundingStep';
import DirectFunding from './DirectFunding';

interface Props {
  state: channelStates.FundingChannelState;
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
    } = this.props;

    switch (state.type) {
      case channelStates.WAIT_FOR_FUNDING_REQUEST:
        return null;
      case channelStates.WAIT_FOR_FUNDING_APPROVAL:
        return (
          <ApproveFunding
            fundingApproved={fundingApproved}
            fundingRejected={fundingRejected}
            requestedTotalFunds={state.fundingState.requestedTotalFunds}
            requestedYourContribution={state.fundingState.requestedYourContribution}
          />
        );
      case channelStates.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP:
        return <DirectFunding state={state.fundingState} />;
      case channelStates.A_WAIT_FOR_POST_FUND_SETUP:
        return <AFundingStep step={4}>Waiting for the other player</AFundingStep>;
      case channelStates.WAIT_FOR_FUNDING_CONFIRMATION:
        return <BFundingStep step={1} />; // TODO: This will need to change based on direct or indirect funding, right?
      case channelStates.B_WAIT_FOR_POST_FUND_SETUP:
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
