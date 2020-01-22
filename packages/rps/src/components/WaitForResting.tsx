import * as React from 'react';

import {Weapon, Result} from '../core';
import {WeaponBadge} from './WeaponBadge';
import {GameLayout} from './GameLayout';
import {Button} from 'reactstrap';

interface Props {
  yourWeapon: Weapon;
  theirWeapon: Weapon;
  result: Result;
  playAgain: () => void;
  waitForOpponent: boolean;
}

export default class WaitForRestingA extends React.PureComponent<Props> {
  renderResultText() {
    const {result} = this.props;

    switch (result) {
      case Result.YouWin:
        return 'You won! 🎉';

      case Result.YouLose:
        return 'You lost 😭';

      default:
        return "It's a tie! 🙄";
    }
  }

  render() {
    const {yourWeapon, theirWeapon, playAgain, waitForOpponent} = this.props;

    return (
      <GameLayout>
        <div className="w-100 text-center">
          <h1 className="mb-5 win-loss-title">{this.renderResultText()}</h1>
          <div className="row">
            <div className="col-sm-6">
              <p className="lead">
                You chose <strong>{Weapon[yourWeapon]}</strong>
              </p>
              <div>
                <WeaponBadge move={yourWeapon} />
              </div>
            </div>
            <div className="col-sm-6">
              <p className="lead">
                Your opponent chose <strong>{Weapon[theirWeapon]}</strong>
              </p>
              <div>
                <WeaponBadge move={theirWeapon} />
              </div>
            </div>
          </div>

          {!waitForOpponent && (
            <Button className="cog-button" onClick={playAgain}>
              Play again
            </Button>
          )}
          {waitForOpponent && <div> Waiting for opponent to confirm </div>}
        </div>
      </GameLayout>
    );
  }
}
