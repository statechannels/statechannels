import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { Button } from 'reactstrap';

import * as channelStates from '../redux/channelState/state';
import * as actions from '../redux/actions';

import AcknowledgeX from '../components/AcknowledgeX';
import { unreachable } from '../utils/reducer-utils';
import ApproveFunding from '../components/funding/ApproveFunding';
import DirectFunding from './DirectFunding';
import { addHex } from '../utils/hex-utils';
import { FundingStep, Step } from '../components/funding/FundingStep';

interface Props {
  state: channelStates.FundingState;
  fundingApproved: () => void;
  fundingRejected: () => void;
  fundingSuccessAcknowledged: () => void;
  fundingDeclinedAcknowledged: () => void;
  retryTransactionAction: (channelId: string) => void;
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
            requestedTotalFunds={state.lastCommitment.commitment.allocation.reduce(addHex)}
            requestedYourContribution={state.lastCommitment.commitment.allocation[state.ourIndex]}
          />
        );
      case channelStates.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP:
      case channelStates.WAIT_FOR_FUNDING_CONFIRMATION:
        return <DirectFunding channelId={state.channelId} />;
      case channelStates.A_WAIT_FOR_POST_FUND_SETUP:
      case channelStates.B_WAIT_FOR_POST_FUND_SETUP:
        return <FundingStep step={Step.CHANNEL_FUNDED}>Waiting for the other player</FundingStep>;
      case channelStates.ACKNOWLEDGE_FUNDING_SUCCESS:
        return (
          <FundingStep step={Step.CHANNEL_FUNDED}>
            <Button onClick={fundingSuccessAcknowledged}>{'Return to game'}</Button>
          </FundingStep>
        );
      case channelStates.ACKNOWLEDGE_FUNDING_DECLINED:
        return (
          <AcknowledgeX
            title="Funding declined!"
            action={fundingDeclinedAcknowledged}
            description="Your opponent has declined to fund the game."
            actionTitle="Return to game"
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  fundingApproved: actions.channel.fundingApproved,
  fundingRejected: actions.channel.fundingRejected,
  fundingSuccessAcknowledged: actions.channel.fundingSuccessAcknowledged,
  fundingDeclinedAcknowledged: actions.channel.fundingDeclinedAcknowledged,
  retryTransactionAction: actions.retryTransaction,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  () => ({}),
  mapDispatchToProps,
)(FundingContainer);
