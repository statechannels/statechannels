import React from 'react';
import {Navbar} from 'reactstrap';
import {bigNumberify, formatUnits} from 'ethers/utils';
import {Blockie} from 'rimble-ui';

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
  );

  opponentDot = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle opacity="0.4" cx="5" cy="5" r="5" fill="white" />
    </svg>
  );

  renderMyDots = count =>
    [...Array(count)].map((e, i) => (
      <div className="col score-dot" key={i}>
        {this.myDot()}
      </div>
    ));

  renderOpponentDots = count =>
    [...Array(count)].map((e, i) => (
      <div className="col score-dot" key={i}>
        {this.opponentDot()}
      </div>
    ));

  render() {
    const {myName, opponentName, roundBuyIn, myBalance, opponentBalance} = this.props;

    const myGameCount = Math.round(
      bigNumberify(myBalance)
        .div(roundBuyIn)
        .toNumber()
    );
    const opponentGameCount = Math.round(
      bigNumberify(opponentBalance)
        .div(roundBuyIn)
        .toNumber()
    );

    return (
      <Navbar className="game-bar">
        <div className="container">
          <Blockie
            opts={{
              seed: myName,
            }}
          />
          <div className="col-2 my-name text-right">{myName}</div>
          <div className="col-auto my-balance">
            <div className="text-center">{formatUnits(myBalance, 'ether')}</div>
            <div className="eth text-center">ETH</div>
          </div>
          <div className="col">
            <div className="row">
              {this.renderMyDots(myGameCount)}
              {this.renderOpponentDots(opponentGameCount)}
            </div>
          </div>
          <div className="col-auto opponent-balance">
            <div className="text-center">{formatUnits(opponentBalance, 'ether')}</div>
            <div className="eth text-center">ETH</div>
          </div>
          <div className="col-2 opponent-name">{opponentName}</div>
          <Blockie
            opts={{
              seed: opponentName,
            }}
          />
        </div>
      </Navbar>
    );
  }
}
