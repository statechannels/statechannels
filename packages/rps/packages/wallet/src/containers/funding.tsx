import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as channelStates from '../redux/channel-state/state';
import * as actions from '../redux/actions';

import { unreachable } from '../utils/reducer-utils';
import { WalletProtocol } from '../redux/types';

interface Props {
  state: channelStates.FundingState;
  fundingApproved: () => void;
  fundingRejected: () => void;
  fundingSuccessAcknowledged: () => void;
  fundingDeclinedAcknowledged: () => void;
  transactionRetryApprovedAction: (channelId: string, protocol: WalletProtocol) => void;
}

class FundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;

    switch (state.type) {
      case channelStates.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP:
      case channelStates.WAIT_FOR_FUNDING_CONFIRMATION:
        // TODO: this line is causing a TS error. This whole container will disappear soon.
        // return <DirectFunding channelId={state.channelId} />;
        return <div />;
      case channelStates.A_WAIT_FOR_POST_FUND_SETUP:
      case channelStates.B_WAIT_FOR_POST_FUND_SETUP:
        // return <FundingStep step={Step.CHANNEL_FUNDED}>Waiting for the other player</FundingStep>;
        return <div />;
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
  transactionRetryApprovedAction: actions.transactionRetryApproved,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  () => ({}),
  mapDispatchToProps,
)(FundingContainer);
