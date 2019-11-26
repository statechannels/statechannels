import * as React from 'react';

import { Button } from 'reactstrap';

import { Weapon, Result } from '../core';
import { WeaponBadge } from './WeaponBadge';
import { GameLayout } from './GameLayout';

interface Props {
  yourWeapon?: Weapon;
  theirWeapon?: Weapon;
  result?: Result;
  shutDownReason?: string;
  playAgain: () => void;
}

export default class ResultPage extends React.PureComponent<Props> {
  renderResultText() {
    const { result } = this.props;

    switch (result) {
      case Result.YouWin:
        return 'You won! 🎉';

      case Result.YouLose:
        return 'You lost 😭';

      case Result.Tie:
        return "It's a tie! 🙄";
      default:
        return '';
    }
  }

  render() {
    const { yourWeapon, theirWeapon, playAgain, shutDownReason } = this.props;

    return (
      <GameLayout>
        {yourWeapon && theirWeapon ? (
          <div className="w-100 text-center">
            <h1 className="mb-5">{this.renderResultText()}</h1>
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
            {!shutDownReason && (
              <Button className="cog-button" onClick={playAgain}>
                Play again
              </Button>
            )}
          </div>
        ) : (
          shutDownReason
        )}
      </GameLayout>
    );
  }
}
