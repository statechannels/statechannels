import React from "react";

import web3Utils from 'web3-utils';
import hexToBN from '../utils/hexToBN';

import { Navbar } from "reactstrap";

interface Props {
  myName: string;
  opponentName: string;
  myBalance: string;
  opponentBalance: string;
  roundBuyIn: string;
}

export default class GameBar extends React.PureComponent<Props> {

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
    const { myName, opponentName, roundBuyIn, myBalance, opponentBalance} = this.props;

    const myGameCount = Math.round(hexToBN(myBalance).div(hexToBN(roundBuyIn)).toNumber());
    const opponentGameCount = Math.round(hexToBN(opponentBalance).div(hexToBN(roundBuyIn)).toNumber());

    return (
      <Navbar className='game-bar'>
        <div className='container'>
          <div className="col-2 my-name text-right">
            {myName}
          </div>
          <div className="col-auto my-balance">
            <div className="text-center">
              {web3Utils.fromWei(myBalance, 'ether')}
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
              {web3Utils.fromWei(opponentBalance, 'ether')}
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
