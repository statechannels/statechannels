import * as React from 'react';

import {Button} from 'reactstrap';

import {Weapon, Result} from '../core';
import {WeaponBadge} from './WeaponBadge';
import {GameLayout} from './GameLayout';

interface Props {
  yourWeapon: Weapon;
  theirWeapon: Weapon;
  result: Result;
  action: () => void;
}

export default class InsufficientFunds extends React.PureComponent<Props> {
  renderResultText() {
    const {result} = this.props;

    switch (result) {
      case Result.YouWin:
        return 'You won! 🎉 And your opponent ran out of funds';

      case Result.YouLose:
        return 'You lost 😭 And you have run out of funds';

      default:
        return '';
    }
  }

  render() {
    const {yourWeapon, theirWeapon, action} = this.props;

    return (
      // TODO extract the badges into a new component shared with ResultPlayAgain
      <GameLayout>
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
          <Button className="cog-button" onClick={action}>
            {'Ok'}
          </Button>
        </div>
        )
      </GameLayout>
    );
  }
}
