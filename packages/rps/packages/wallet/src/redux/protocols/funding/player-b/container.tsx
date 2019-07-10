import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as actions from './actions';
import * as states from './states';
import { unreachable } from '../../../../utils/reducer-utils';
import { TwoPartyPlayerIndex } from '../../../types';
import WaitForOtherPlayer from '../../shared-components/wait-for-other-player';
import AcknowledgeX from '../../shared-components/acknowledge-x';
import { ActionDispatcher } from '../../../utils';
import { IndirectFunding } from '../../indirect-funding/container';
import ApproveX from '../../shared-components/approve-x';
interface Props {
  state: states.OngoingFundingState;
  strategyApproved: ActionDispatcher<actions.StrategyApproved>;
  strategyRejected: ActionDispatcher<actions.StrategyRejected>;
  fundingSuccessAcknowledged: ActionDispatcher<actions.FundingSuccessAcknowledged>;
  cancelled: ActionDispatcher<actions.Cancelled>;
}

class FundingContainer extends PureComponent<Props> {
  render() {
    const { state, strategyApproved, cancelled, fundingSuccessAcknowledged } = this.props;
    const { processId } = state;

    switch (state.type) {
      case 'Funding.PlayerB.WaitForStrategyProposal':
        return (
          <WaitForOtherPlayer
            actionDescriptor={'strategy choice'}
            channelId={state.targetChannelId}
          />
        );
      case 'Funding.PlayerB.WaitForStrategyApproval':
        return (
          <ApproveX
            title="Funding channel"
            description="Do you want to fund this state channel with a re-usable ledger channel?"
            yesMessage="Fund Channel"
            noMessage="Cancel"
            approvalAction={() =>
              strategyApproved({ processId, strategy: 'IndirectFundingStrategy' })
            }
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
      case 'Funding.PlayerB.WaitForFunding':
        return <IndirectFunding state={state.fundingState} />;
      case 'Funding.PlayerB.WaitForSuccessConfirmation':
        return (
          <AcknowledgeX
            title="Channel funded!"
            action={() => fundingSuccessAcknowledged({ processId })}
            description="You have successfully funded your channel"
            actionTitle="Ok!"
          />
        );
      case 'Funding.PlayerB.WaitForPostFundSetup':
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
  strategyChosen: actions.strategyProposed,
  strategyApproved: actions.strategyApproved,
  strategyRejected: actions.strategyRejected,
  fundingSuccessAcknowledged: actions.fundingSuccessAcknowledged,
  cancelled: actions.cancelled,
};

export const Funding = connect(
  () => ({}),
  mapDispatchToProps,
)(FundingContainer);
