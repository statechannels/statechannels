import React from 'react';
import walletHeaderIcon from '../../images/wallet_header_icon.svg';

export interface Props {
    loginDisplayName;
    title;
    content;
}

export default class WalletMessage extends React.Component<Props>{
    render() {
        const { title, content } = this.props;
        return (
            <div className="message-container">
                <div className="message-header">
                    <img src={walletHeaderIcon} className="message-header-icon" />
                    <div className="message-circle">
                        <div className="message-user">{this.getInitials(this.props.loginDisplayName)}</div>
                    </div>
                </div>
                <div className="message-text">
                    <div className="message-title">{title}</div>
                    {content}
                </div>
            </div>);
    }

    getInitials(loginDisplayName: string): string {
        const userDisplayName = loginDisplayName.split(" ");
        return userDisplayName.map(name => name.charAt(0)).join("");
    }
}
