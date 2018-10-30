import React from 'react';
import Button from 'reactstrap/lib/Button';
import walletIcon from '../../images/wallet_icon.svg';

interface Props {
    expiryTime: number;
    loginDisplayName: string;
    withdraw: () => void;
}

export default class ChallengeExpired extends React.PureComponent<Props> {

    render() {
        const { expiryTime } = this.props;
        const parsedExpiryDate = new Date(expiryTime * 1000).toLocaleTimeString();
        return (
            <div className="challenge-expired-text challenge-expired-container">
                <div className="challenge-expired-header">
                    <img src={walletIcon} />
                    <div className="challenge-expired-circle">
                        <div className="challenge-expired-user">{this.getInitials(this.props.loginDisplayName)}</div>
                    </div>
                </div>
                <img src={walletIcon} className="challenge-expired-icon" />
                <div className="challenge-expired-title">A challenge has expired</div>
                <p>The challenge expired at {parsedExpiryDate}. You may now withdraw your funds.</p>
                <div className="challenge-expired-button-container" >
                    <Button className="challenge-expired-button" onClick={() => { this.props.withdraw(); }}  >Withdraw</Button>;
          </div>
            </div>);
    }

    getInitials(loginDisplayName: string): string {
        const userDisplayName = loginDisplayName.split(" ");
        return userDisplayName.map(name => name.charAt(0)).join("");
    }
}
