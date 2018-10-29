import React from "react";
import { State } from "fmg-core";
import { Button } from "reactstrap";

import BN from 'bn.js';
import web3Utils from 'web3-utils';
import { OpenGame } from "src/redux/open-games/state";
import hexToBN from "../utils/hexToBN";
import bnToHex from "../utils/bnToHex";

interface Props {
  openGame: OpenGame;
  joinOpenGame: (
    opponentName: string,
    opponentAddress: string,
    channelNonce: number,
    roundBuyIn: string,
  ) => void;
}

export class OpenGameEntry extends React.PureComponent<Props, State> {
  render() {
    const { openGame, joinOpenGame } = this.props;
    const joinThisGame = () => joinOpenGame(
      openGame.name,
      openGame.address,
      5,
      openGame.stake);

    const stake = openGame.stake;
    const buyin = bnToHex(hexToBN(openGame.stake).mul(new BN(5)));
    return (
      <div className="ogc-container m-1">
        <div className="ogc-header">
          <div className="ogc-vs">vs</div> <div className="ogc-opponent-name">{openGame.name}</div>
        </div>
        <div className="ogc-stakes">
          <div className="ogc-buyin pr-3">
            <div className="ogc-stake-header">Game Buy In:</div>
            <div className="ogc-stake-amount">{web3Utils.fromWei(buyin, 'ether')}</div>
            <div className="ogc-stake-currency">ETH</div>
          </div>
          <svg className="ogc-divider">
            <line x1="0" y1="0" x2="0" y2="14"/>
          </svg>
          <div className="ogc-round-buyin pl-3">
            <div className="ogc-stake-header">Round Buy In:</div>
            <div className="ogc-stake-amount">{web3Utils.fromWei(stake, 'ether')}</div>
            <div className="ogc-stake-currency">ETH</div>
          </div>
        </div>
        <Button className="ogc-join" onClick={joinThisGame}>Join</Button>
      </div>

    );
  }
}
