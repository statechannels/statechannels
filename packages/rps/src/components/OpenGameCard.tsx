import React from 'react';
import {Commitment} from 'fmg-core';
import {Button} from 'reactstrap';
import {OpenGame} from '../redux/open-games/state';
import {bigNumberify, formatUnits} from 'ethers/utils';
import {Blockie} from 'rimble-ui';

interface Props {
  openGame: OpenGame;
  joinOpenGame: (
    opponentName: string,
    opponentAddress: string,
    opponentOutcomeAddress: string,
    roundBuyIn: string
  ) => void;
}

export class OpenGameEntry extends React.PureComponent<Props, Commitment> {
  render() {
    // Generate a random number from 0 to MaxInt
    const {openGame, joinOpenGame} = this.props;
    const joinThisGame = () =>
      joinOpenGame(openGame.name, openGame.address, openGame.outcomeAddress, openGame.stake);

    const stake = openGame.stake;
    const buyin = bigNumberify(openGame.stake)
      .mul(5)
      .toHexString();
    return (
      <div className="ogc-container m-1">
        <div className="ogc-header">
          <div className="ogc-vs">vs</div> <div className="ogc-opponent-name">{openGame.name}</div>
        </div>
        <Blockie
          opts={{
            seed: openGame.outcomeAddress.toLowerCase(),
          }}
        />
        <div className="ogc-stakes">
          <div className="ogc-buyin pr-3">
            <div className="ogc-stake-header">Game Buy In:</div>
            <div className="ogc-stake-amount">{formatUnits(buyin, 'ether')}</div>
            <div className="ogc-stake-currency">ETH</div>
          </div>
          <svg className="ogc-divider">
            <line x1="0" y1="0" x2="0" y2="14" />
          </svg>
          <div className="ogc-round-buyin pl-3">
            <div className="ogc-stake-header">Round Buy In:</div>
            <div className="ogc-stake-amount">{formatUnits(stake, 'ether')}</div>
            <div className="ogc-stake-currency">ETH</div>
          </div>
        </div>
        <Button className="ogc-join" onClick={joinThisGame}>
          Join
        </Button>
      </div>
    );
  }
}
