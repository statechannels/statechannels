import React from 'react';
import { Button } from 'reactstrap';
import walletIcon from '../../images/wallet_icon.svg';

export interface Props {
  approve: () => void;
  decline?: () => void;
}

export default class WalletWelcome extends React.Component<Props>{
  render() {
    const { approve, decline } = this.props;
    return (
      <div className="welcome-text welcome-container">
        <img src={walletIcon} className="welcome-icon" />
        <div className="welcome-title">
          Withdraw with the State Stash Wallet
        </div>

        <div>
          <p>This State Stash wallet enables you to quickly withdraw your funds.</p>
          <p>We’ll guide you through a few simple steps to get it setup and your ETH transferred.</p>
        </div>
        <div className="welcome-button-container" >
          <Button className="welcome-button" onClick={approve}>Continue</Button>
        </div>
        {decline ? <Button className="welcome-cancel-button" onClick={decline}>Cancel</Button> : <div className="welcome-spacer" />}
      </div>
    );
  }
}
