import React from 'react';
import BN from 'bn.js';
import progressIcon from '../../images/icon_arrow.svg';
import completedIcon from '../../images/icon_success.svg';
import waitingIcon from '../../images/icon_loading.svg';
import progressIconGrey from '../../images/icon_arrow_grey.svg';
import completedIconGrey from '../../images/icon_success_grey.svg';
import waitingIconGrey from '../../images/icon_loading_grey.svg';
import ethIcon from '../../images/ethereum_icon.svg';

import web3Utils from 'web3-utils';
import Button from 'reactstrap/lib/Button';

export enum BlockchainStatus { NotStarted, InProgress, Completed }
interface Props {
  loginDisplayName: string;
  player: number;
  amount: BN;
  deployStatus: BlockchainStatus;
  depositStatus: BlockchainStatus;
  returnToGame?: () => void;
}


export default class FundingInProgress extends React.PureComponent<Props> {

  render() {
    const { player, deployStatus, depositStatus, amount, returnToGame } = this.props;
    const deployTitle = player === 0 ? "Your Transfer" : "Opponent Transfer";
    const depositTitle = player === 0 ? "Opponent Transfer" : "Your Transfer";
    const deployStyling = depositStatus !== BlockchainStatus.NotStarted ? "funding-off deploy-container" : 'deploy-container';
    const depositStyling = depositStatus === BlockchainStatus.NotStarted ? "funding-off deposit-container" : 'deposit-container';
    const fundingComplete = deployStatus === BlockchainStatus.Completed && depositStatus === BlockchainStatus.Completed;
    return (
      <div className="funding-container" >
        <div className="funding-header">
          <img src={ethIcon} />
          <div className="funding-circle">
            <div className="funding-user">{this.getInitials(this.props.loginDisplayName)}</div>
          </div>
        </div>
        <div className="transfer-container">
          <div className={deployStyling}>
            <img className="deploy-icon" src={this.getIcon(deployStatus, depositStatus !== BlockchainStatus.NotStarted)} />
            <div className="deploy-title">{deployTitle}</div>
            <div className="deploy-amount">Amount {web3Utils.fromWei(amount, 'ether')} ETH</div>
          </div>
          <div className="funding-divider" />
          <div className={depositStyling}>
            <img className="deposit-icon funding-off" src={this.getIcon(depositStatus, depositStatus === BlockchainStatus.NotStarted)} />
            <div className="deposit-title">{depositTitle}</div>
            <div className="deposit-amount">Amount {web3Utils.fromWei(amount, 'ether')} ETH</div>
          </div>

        </div>
        {fundingComplete && returnToGame && <Button className="return-button" onClick={returnToGame} >Return to Game</Button>}
      </div>
    );
  }
  getInitials(loginDisplayName: string): string {
    const userDisplayName = loginDisplayName.split(" ");
    return userDisplayName.map(name => name.charAt(0)).join("");
  }


  getIcon(blockchainStatus: BlockchainStatus, disabledIcon: boolean) {
    switch (blockchainStatus) {
      case BlockchainStatus.NotStarted:
        return disabledIcon ? waitingIconGrey : waitingIcon;
        break;
      case BlockchainStatus.InProgress:
        return disabledIcon ? progressIconGrey : progressIcon;
        break;
      case BlockchainStatus.Completed:
        return disabledIcon ? completedIconGrey : completedIcon;
        break;
    }
  }
}
