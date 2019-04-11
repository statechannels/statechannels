import React from 'react';
import Button from 'reactstrap/lib/Button';
import walletIcon from '../../../images/wallet-iconn.svg';
import StatusBarLayout from '../status-bar-layout';

interface Props {
  withdrawalSuccessAcknowledged: () => void;
}

export default class ApproveWithdrawalRetry extends React.PureComponent<Props> {
  render() {
    const { withdrawalSuccessAcknowledged } = this.props;
    return (
      <StatusBarLayout>
        <img src={walletIcon} />
        <div className="challenge-expired-title">Withdrawal successful!</div>
        <p>You have successfully deposited funds into your channel.</p>
        <div className="challenge-expired-button-container">
          <Button className="challenge-expired-button" onClick={withdrawalSuccessAcknowledged}>
            Return to app
          </Button>
        </div>
      </StatusBarLayout>
    );
  }
}
