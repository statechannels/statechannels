import React from 'react';
import { YourMarker, TheirMarker } from './Marker';
import web3Utils from 'web3-utils';
import { Player, Marker } from '../core';

interface Props {
  onScreenBalances: [string, string];
  player: Player;
  you: Marker;
}

export default class StatusAndBalances extends React.PureComponent<Props> {
  renderYourBalance(onScreenBalances: [string, string], player: Player) {
    if (player === Player.PlayerA) {
      return <span>{web3Utils.fromWei(onScreenBalances[0], 'ether')}</span>;
    }
    if (player === Player.PlayerB) {
      return <span>{web3Utils.fromWei(onScreenBalances[1], 'ether')} </span>;
    } else { return; }
  }
  renderTheirBalance(onScreenBalances: [string, string], player: Player) {
    if (player === Player.PlayerA) {
      return <span>{web3Utils.fromWei(onScreenBalances[1], 'ether')}</span>;
    }
    if (player === Player.PlayerB) {
      return <span>{web3Utils.fromWei(onScreenBalances[0], 'ether')} </span>;
    } else { return; }
  }

  render() {
    const { onScreenBalances, player, you } = this.props;
    return (
      <div id="status-container">
        <h1 className="full-width-bar" id="top-bar" >&nbsp;<YourMarker you={you} />&nbsp;[You]&nbsp;
      <span>
            {this.renderYourBalance(onScreenBalances, player)} ETH
          </span>&nbsp;|
      <span>
            &nbsp;{this.renderTheirBalance(onScreenBalances, player)} ETH
          </span>
          &nbsp;[Them]&nbsp;<TheirMarker you={you} />
        </h1>
      </div>
    );
  }
}