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
        <div className="welcome-title">Welcome to StateStash!</div>
        <div>
          <p>StateStash is a <strong><em>channel wallet</em></strong>. You'll use it to interact with this state channel application.</p>
          <p>The first step is open a state channel with your opponent and deposit funds into it. We'll guide you through that now!</p>
        </div>
        <div className="welcome-button-container" >
          <Button className="welcome-button" onClick={approve}>Continue</Button>
        </div>
        {decline ? <Button className="welcome-cancel-button" onClick={decline}>Cancel</Button> : <div className="welcome-spacer" />}
      </div>);
  }
}
