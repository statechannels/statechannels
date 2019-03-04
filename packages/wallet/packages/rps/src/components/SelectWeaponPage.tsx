import React from 'react';

import { Weapon }  from '../core';

import { WeaponBadge } from './WeaponBadge';

import { GameLayout } from './GameLayout';


interface Props {
  chooseWeapon: (move: Weapon) => void;
  afterOpponent?: any;
  challengeExpirationDate?:number;

}

export default class SelectWeaponStep extends React.PureComponent<Props> {
  renderChooseButton(chooseWeapon: (move: Weapon) => void, move: Weapon, description: string) {
    return (
      <WeaponBadge move={move} action={() => chooseWeapon(move)} />
    );
  }

  render() {
    const { afterOpponent, chooseWeapon, challengeExpirationDate } = this.props;
    const renderChooseButton = this.renderChooseButton;

    return (
      <GameLayout>
        <div className="w-100 text-center mb-5">
          <h1 className="mb-5">
          {challengeExpirationDate && `Challenge detected, respond by ${new Date(challengeExpirationDate).toString()}` }
            {afterOpponent
              ? 'Your opponent has chosen a move, now choose yours:'
              : 'Choose your move:'}
          </h1>
          <div className="row w-100">
            <div className="col-sm-4">{renderChooseButton(chooseWeapon, Weapon.Rock, 'Rock')}</div>
            <div className="col-sm-4">{renderChooseButton(chooseWeapon, Weapon.Paper, 'Paper')}</div>
            <div className="col-sm-4">
              {renderChooseButton(chooseWeapon, Weapon.Scissors, 'Scissors')}
            </div>
          </div>
        </div>
      </GameLayout>
    );
  }
}
