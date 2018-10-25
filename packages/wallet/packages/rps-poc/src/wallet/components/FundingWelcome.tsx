import React from 'react';
import { Button } from 'reactstrap';
import ethIcon from '../../images/ethereum_icon.png';

export interface Props {
    approve: () => void;
    decline: () => void;
}

export default class FundingWelcome extends React.Component<Props>{
    render(){
        return(
            <div className="wallet-text wallet-container">
            <img src={ethIcon} className="wallet-icon"/>
            <div className="wallet-title"> Transfer Funds with this State Stash Wallet</div>
            <p>This wallet enables you to quickly transfer to funds to buy in and withdraw from games.</p>
            <p>We’ll guide you through a few simple steps to get it setup and your ETH transferred.</p>
            <div className="wallet-button-container" > 
            <Button className="wallet-button"  onClick={this.props.approve}>Continue</Button>
            </div>
            <Button  className="wallet-cancel-button" onClick={this.props.decline}>Cancel</Button>
        </div>);
    }
}
