import React from 'react';
import ApproveX from '../approve-x';
import * as web3Utils from 'web3-utils';

interface Props {
  fundingApproved: () => void;
  fundingRejected: () => void;
  requestedTotalFunds: string;
  requestedYourContribution: string;
}

export default class ApproveFunding extends React.PureComponent<Props> {
  render() {
    const {
      fundingApproved,
      fundingRejected,
      requestedTotalFunds,
      requestedYourContribution,
    } = this.props;
    return (
      <ApproveX
        title="Opening channel"
        description="Do you want to open this state channel?"
        yesMessage="Open Channel"
        noMessage="Cancel"
        approvalAction={fundingApproved}
        rejectionAction={fundingRejected}
      >
        <React.Fragment>
          This site wants you to open a new state channel.
          <br />
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
          <br />
        </React.Fragment>
      </ApproveX>
    );
  }
}
