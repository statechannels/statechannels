import React from 'react';

import { Play } from '../game-engine/positions';

import { Button } from 'reactstrap';
import MoveIcon from './MoveIcon';

interface Props {
  choosePlay: (play: Play) => void;
  abandonGame: () => void;
  afterOpponent?: any;
  challengeExpirationDate?:number;

}

export default class SelectPlayStep extends React.PureComponent<Props> {
  renderChooseButton(choosePlay: (play: Play) => void, play: Play, description: string) {
    return (
      <Button onClick={() => choosePlay(play)} color="light" className="w-75 p-3">
        <div className="mb-3">
          <h1>{description}</h1>
          <MoveIcon play={play} />
        </div>
      </Button>
    );
  }

  render() {
    const { afterOpponent, choosePlay, abandonGame, challengeExpirationDate } = this.props;
    const renderChooseButton = this.renderChooseButton;

    return (
      <div className="container centered-container">
        <div className="w-100 text-center mb-5">
          <h1 className="mb-5">
          {challengeExpirationDate && `Challenge detected, respond by ${new Date(challengeExpirationDate).toString()}` }
            {afterOpponent
              ? 'Your opponent has chosen a move, now choose yours:'
              : 'Choose your move:'}
          </h1>
          <div className="row w-100">
            <div className="col-sm-4">{renderChooseButton(choosePlay, Play.Rock, 'Rock')}</div>
            <div className="col-sm-4">{renderChooseButton(choosePlay, Play.Paper, 'Paper')}</div>
            <div className="col-sm-4">
              {renderChooseButton(choosePlay, Play.Scissors, 'Scissors')}
            </div>
          </div>
          <div className="mt-5">
            <Button onClick={() => abandonGame()} color="dark" className="w-75 p-3">
              <h1>Abandon game</h1>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
