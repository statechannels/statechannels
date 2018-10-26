import React from "react";
import BN from 'bn.js';

import { Navbar } from "reactstrap";
import { State } from "fmg-core";

interface Props {
  myName: string;
  opponentName: string;
  myBalance: BN;
  opponentBalance: BN;
  roundBuyIn: BN;
}

export default class GameBar extends React.PureComponent<Props, State> {

  myDot = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="5" fill="white" />
      <circle cx="10" cy="10" r="9.5" stroke="white" />
    </svg>
  )

  opponentDot = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle opacity="0.4" cx="5" cy="5" r="5" fill="white" />
    </svg>
  )

  renderMyDots = (count) => (
    [...Array(count)].map((e, i) => <div className="col score-dot" key={i}>{this.myDot()}</div>)
  )

  renderOpponentDots = (count) => (
    [...Array(count)].map((e, i) => <div className="col score-dot" key={i}>{this.opponentDot()}</div>)
  )

  render() {
    const { myName, opponentName } = this.props;

    // todo: fix this - the balances passed in seem to be strings and not BNs ....
    const roundBuyIn = new BN(1);
    const myBalance = new BN(5);
    const opponentBalance = new BN(5);

    const myGameCount = Math.round(myBalance.div(roundBuyIn).toNumber());
    const opponentGameCount = Math.round(opponentBalance.div(roundBuyIn).toNumber());

    return (
      <Navbar className='game-bar'>
        <div className='container'>
          <div className="col-2 my-name text-right">
            {myName}
          </div>
          <div className="col-auto my-balance">
            <div className="text-center">
              {myBalance.toNumber().toFixed(3)}
            </div>
            <div className="eth text-center">
              ETH
            </div>
          </div>
          <div className="col">
            <div className="row">
              {this.renderMyDots(myGameCount)}
              {this.renderOpponentDots(opponentGameCount)}
            </div>
          </div>
          <div className="col-auto opponent-balance">
            <div className="text-center">
              {opponentBalance.toNumber().toFixed(3)}
            </div>
            <div className="eth text-center">
              ETH
            </div>
          </div>
          <div className="col-2 opponent-name">
            {opponentName}
          </div>
        </div>
      </Navbar>
    );
  }
}
