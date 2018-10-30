import React from 'react';
import BN from 'bn.js';
import progressIcon from '../../images/icon_arrow.svg';
import completedIcon from '../../images/icon_success.svg';
import waitingIcon from '../../images/icon_loading.svg';

import walletHeaderIcon from '../../images/wallet_header_icon.svg';

import web3Utils from 'web3-utils';
import Button from 'reactstrap/lib/Button';

export enum BlockchainStatus { NotStarted, InProgress, Completed }
interface Props {
  loginDisplayName: string;
  amount: BN;
  withdrawStatus: BlockchainStatus;
  exitGame?: () => void;
}


export default class WithdrawInProgress extends React.PureComponent<Props> {
  render() {
    let title;
    const { withdrawStatus, amount, exitGame } = this.props;
    switch (withdrawStatus) {
      case BlockchainStatus.NotStarted:
        title = "Your Transfer";
        break;
      case BlockchainStatus.InProgress:
        title = " Transfer in Progress";
        break;
      case BlockchainStatus.Completed:
        title = "Transfer Complete";
    }


    return (
      <div className="withdraw-container" >
        <div className="withdraw-header">
          <img src={walletHeaderIcon} className="withdraw-header-icon" />
          <div className="withdraw-circle">
            <div className="withdraw-user">{this.getInitials(this.props.loginDisplayName)}</div>
          </div>
        </div>
        <div className="withdraw-transfer-container">
          <div className="withdraw-container">
            <img className="withdraw-icon" src={this.getIcon(withdrawStatus)} />
            <div className="withdraw-title">{title}</div>
            <div className="withdraw-amount">Amount {web3Utils.fromWei(amount, 'ether')} ETH</div>
            Check your wallet to see the status of the transaction.
        </div>
        </div>
        {withdrawStatus === BlockchainStatus.Completed && exitGame && <Button className="exit-game-button" onClick={exitGame} >Exit Game</Button>}
      </div>
    );
  }
  getInitials(loginDisplayName: string): string {
    const userDisplayName = loginDisplayName.split(" ");
    return userDisplayName.map(name => name.charAt(0)).join("");
  }


  getIcon(blockchainStatus: BlockchainStatus) {
    switch (blockchainStatus) {
      case BlockchainStatus.NotStarted:
        return waitingIcon;
        break;
      case BlockchainStatus.InProgress:
        return progressIcon;
        break;
      case BlockchainStatus.Completed:
        return completedIcon;
        break;
    }
  }
}
