import React from 'react';

import {Weapon} from '../core';
import {WeaponBadge} from './WeaponBadge';
import {GameLayout} from './GameLayout';

interface Props {
  message: string;
  yourWeapon: Weapon;
}

export default class WeaponSelectedPage extends React.PureComponent<Props> {
  static defaultProps = {
    selectedMoveId: null,
  };

  render() {
    const {message, yourWeapon} = this.props;

    return (
      <GameLayout>
        <div className="w-100 text-center">
          <h1 className="mb-5">Move chosen!</h1>
          <p className="lead">
            You chose <strong>{Weapon[yourWeapon]}</strong>
          </p>

          <div>
            <WeaponBadge move={yourWeapon} />
          </div>
          <p>{message}</p>
        </div>
      </GameLayout>
    );
  }
}
