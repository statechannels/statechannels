import React from "react";
import { State } from "fmg-core";
import { Button } from "reactstrap";

import BN from 'bn.js';
import web3Utils from 'web3-utils';
import { OpenGame } from "src/redux/open-games/state";

interface Props {
  openGame: OpenGame;
  joinOpenGame: (
    myName: string,
    myAddress: string,
    opponentName: string,
    opponentAddress: string,
    libraryAddress: string,
    channelNonce: number,
    roundBuyIn: BN,
  ) => void;
}

export class OpenGameEntry extends React.PureComponent<Props, State> {
  render() {
    const { openGame, joinOpenGame } = this.props;
    const joinThisGame = () => joinOpenGame(
      'TODO myName',
      'TODO myAddress',
      openGame.name,
      openGame.address,
      'TODO libraryAddress',
      5,
      openGame.stake);

    const stake = openGame.stake;
    // TODO: should not hardcode the number of rounds
    const buyin = new BN(5000000000000000);
    return (
      <div className="ogc-container card text-center">
        <div className="card-body">
          <div className="ogc-header">
            <div className="ogc-vs">vs</div> <div className="ogc-opponent-name">{openGame.name}</div>
          </div>
          <div className="ogc-stakes">
            <div className="ogc-buyin">
              <div className="ogc-stake-header">Buy In:</div>
              <div className="ogc-stake-amount">{web3Utils.fromWei(buyin.toString(), 'ether')}</div>
              <div className="ogc-stake-currency">ETH</div>
            </div>
            <div className="ogc-wager">
              <div className="ogc-stake-header">Wager:</div>
              <div className="ogc-stake-amount">{web3Utils.fromWei(stake.toString(), 'ether')}</div>
              <div className="ogc-stake-currency">ETH</div>
            </div>
          </div>
          <Button className="ogc-join" onClick={joinThisGame}>Join</Button>
        </div>
      </div>

    );
  }
}
