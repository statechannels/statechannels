import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as actions from './actions';
import * as states from './states';

import { unreachable } from '../../../utils/reducer-utils';
import WaitForOtherPlayer from '../shared-components/wait-for-other-player';
import AcknowledgeX from '../shared-components/acknowledge-x';
import { ActionDispatcher } from '../../utils';
import { LedgerFunding } from '../ledger-funding/container';
import { FundingStrategyNegotiation } from '../funding-strategy-negotiation/container';
import { VirtualFunding } from '../virtual-funding/container';

interface Props {
  state: states.OngoingFundingState;

  fundingSuccessAcknowledged: ActionDispatcher<actions.FundingSuccessAcknowledged>;
}

class FundingContainer extends PureComponent<Props> {
  render() {
    const { state, fundingSuccessAcknowledged } = this.props;
    const { processId } = state;

    switch (state.type) {
      case 'Funding.WaitForStrategyNegotiation':
        return <FundingStrategyNegotiation state={state.fundingStrategyNegotiationState} />;
      case 'Funding.WaitForLedgerFunding':
        return <LedgerFunding state={state.fundingState} />;
      case 'Funding.WaitForVirtualFunding':
        return <VirtualFunding state={state.fundingState} />;
      case 'Funding.WaitForSuccessConfirmation':
        return (
          <AcknowledgeX
            title="Channel funded!"
            action={() => fundingSuccessAcknowledged({ processId })}
            description="You have successfully funded your channel"
            actionTitle="Ok!"
          />
        );
      case 'Funding.WaitForPostFundSetup':
        return (
          <WaitForOtherPlayer
            actionDescriptor={'post funding confirmation'}
            channelId={state.targetChannelId}
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  fundingSuccessAcknowledged: actions.fundingSuccessAcknowledged,
};

export const Funding = connect(
  () => ({}),
  mapDispatchToProps,
)(FundingContainer);
