import React from 'react';
import BN from 'bn.js';
import progressIcon from '../../images/icon_arrow.svg';
import completedIcon from '../../images/icon_success.svg';
import waitingIcon from '../../images/icon_loading.svg';
import progressIconGrey from '../../images/icon_arrow_grey.svg';
import completedIconGrey from '../../images/icon_success_grey.svg';
import waitingIconGrey from '../../images/icon_loading_grey.svg';
import walletHeaderIcon from '../../images/wallet_header_icon.svg';

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
    const depositTitle = player === 1 ? "Your Transfer" : "Opponent Transfer";
    const playerAIsFunding = deployStatus !== BlockchainStatus.Completed;
    const playerBIsFunding = depositStatus === BlockchainStatus.InProgress;
    const deployStyling = !playerAIsFunding ? "funding-off deploy-container" : 'deploy-container';
    const depositStyling = !playerBIsFunding ? "funding-off deposit-container" : 'deposit-container';
    const fundingComplete = deployStatus === BlockchainStatus.Completed && depositStatus === BlockchainStatus.Completed;

    return (
      <div className="funding-container" >
        <div className="funding-header">
          <img src={walletHeaderIcon} className="funding-header-icon" />
          <div className="funding-circle">
            <div className="funding-user">{this.getInitials(this.props.loginDisplayName)}</div>
          </div>
        </div>
        <div className="transfer-container">
          <div className={deployStyling}>
            <img className="deploy-icon" src={this.getIcon(deployStatus,!playerAIsFunding)} />
            <div className="deploy-title">{deployTitle}</div>
            <div className="deploy-amount">Amount {web3Utils.fromWei(amount, 'ether')} ETH</div>
            {player === 0 && playerAIsFunding && <div >Check your wallet to see the status of the transaction.</div>}
            {}
          </div>
          <div className="funding-divider" />
          <div className={depositStyling}>
            <img className="deposit-icon funding-off" src={this.getIcon(depositStatus, !playerBIsFunding)} />
            <div className="deposit-title">{depositTitle}</div>
            <div className="deposit-amount">Amount {web3Utils.fromWei(amount, 'ether')} ETH</div>
            {player === 1 && playerBIsFunding && <div >Check your wallet to see the status of the transaction.</div>}
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
