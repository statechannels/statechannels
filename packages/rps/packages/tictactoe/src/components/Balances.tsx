import React from 'react';
import { Player } from '../core';
// import hexToBN from '../utils/hexToBN';

interface Props {
  stateType: string;
  onScreenBalances: [string, string];
  player: Player;
}

export default class Balances extends React.PureComponent<Props> {
  renderYourBalance(onScreenBalances: [string, string], player: Player) {
    if (player === Player.PlayerA) {
      return <span>?</span>;
    }
    if (player === Player.PlayerB) {
      return <span>?</span>;
    } else { return; }
  }
  renderTheirBalance(onScreenBalances: [string, string], player: Player) {
    if (player === Player.PlayerA) {
      return <span>{onScreenBalances[1]}</span>;
    }
    if (player === Player.PlayerB) {
      return <span>{onScreenBalances[0]}</span>;
    } else { return; }
  }

  render() {
    const { onScreenBalances, player } = this.props;
    return (<h1 className="full-width-bar" >[You]&nbsp;
      <span>
        {this.renderYourBalance(onScreenBalances, player)}
      </span>&nbsp;|
      <span>
        &nbsp;{this.renderTheirBalance(onScreenBalances, player)}
      </span>
      &nbsp;[Them]
      </h1>

    );
  }
}