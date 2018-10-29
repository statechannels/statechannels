import React from 'react';
import { Button } from 'reactstrap';
import walletIcon from '../../images/wallet_icon.svg';

export interface Props {
    approve: () => void;
    decline?: () => void;
    title;
    content;
}

export default class WalletWelcome extends React.Component<Props>{
    render(){
        const {title, content, approve, decline} = this.props;
        return(
            <div className="welcome-text welcome-container">
            <img src={walletIcon} className="welcome-icon"/>
            <div className="welcome-title">{title}</div>
            {content}
            <div className="welcome-button-container" > 
            <Button className="welcome-button"  onClick={approve}>Continue</Button>
            </div>
            {decline ? <Button className="welcome-cancel-button" onClick={decline}>Cancel</Button>:<div className="welcome-spacer"/>}
        </div>);
    }
}
