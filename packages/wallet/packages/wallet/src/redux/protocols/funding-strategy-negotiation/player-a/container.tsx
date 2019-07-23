import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as actions from './actions';
import * as states from './states';

import { unreachable } from '../../../../utils/reducer-utils';
import { TwoPartyPlayerIndex } from '../../../types';
import WaitForOtherPlayer from '../../shared-components/wait-for-other-player';
import { ActionDispatcher } from '../../../utils';
import ApproveX from '../../shared-components/approve-x';

interface Props {
  state: states.OngoingFundingStrategyNegotiationState;
  strategyChosen: ActionDispatcher<actions.StrategyChosen>;
  strategyApproved: typeof actions.strategyApproved;
  strategyRejected: ActionDispatcher<actions.StrategyRejected>;
  cancelled: ActionDispatcher<actions.Cancelled>;
}

class FundingStrategyNegotiationContainer extends PureComponent<Props> {
  render() {
    const { state, strategyChosen, cancelled } = this.props;
    const { processId } = state;

    switch (state.type) {
      case 'FundingStrategyNegotiation.PlayerA.WaitForStrategyChoice':
        return (
          <ApproveX
            title="Funding channel"
            description="Do you want to fund this state channel with a virtual channel?"
            yesMessage="Fund Channel"
            noMessage="Cancel"
            approvalAction={() => strategyChosen({ processId, strategy: 'VirtualFundingStrategy' })}
            rejectionAction={() => cancelled({ processId, by: TwoPartyPlayerIndex.B })}
          >
            <React.Fragment>
              This site wants you to open a new state channel.
              {/* <br /> // TODO: modify funding protocol state to store the data necessary to render this
              <br />
              <div className="row">
                <div className="col-sm-6">
                  <h3>{web3Utils.fromWei(requestedTotalFunds, 'ether')} ETH</h3>
                  <div>Total</div>
                </div>
                <div className="col-sm-6">
                  <h3>{web3Utils.fromWei(requestedYourContribution, 'ether')} ETH</h3>
                  <div>Your deposit</div>
                </div>
              </div>
              <br /> */}
            </React.Fragment>
          </ApproveX>
        );
      case 'FundingStrategyNegotiation.PlayerA.WaitForStrategyResponse':
        return (
          <WaitForOtherPlayer
            actionDescriptor={'strategy response'}
            channelId={state.targetChannelId}
          />
        );

      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  strategyChosen: actions.strategyChosen,
  strategyApproved: actions.strategyApproved,
  strategyRejected: actions.strategyRejected,
  cancelled: actions.cancelled,
};

export const FundingStrategyNegotiation = connect(
  () => ({}),
  mapDispatchToProps,
)(FundingStrategyNegotiationContainer);
