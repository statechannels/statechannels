import React, { ReactNode } from 'react';

import { Play } from '../game-engine/positions';

import { Button } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandRock, faHandPaper, faHandScissors } from '@fortawesome/free-solid-svg-icons';

interface Props {
  choosePlay: (play: Play) => void;
  abandonGame: () => void;
  afterOpponent?: any;
}

export default class SelectPlayStep extends React.PureComponent<Props> {
  renderChooseButton(
    choosePlay: (play: Play) => void,
    play: Play,
    description: string,
    icon: ReactNode,
  ) {
    return (
      <Button onClick={() => choosePlay(play)} color="light" className="w-75 p-3">
        <div className='mb-3'>
          <h1>{description}</h1>
          {icon}
        </div>
      </Button>
    );
  }

  render() {
    const { afterOpponent, choosePlay, abandonGame } = this.props;
    const renderChooseButton = this.renderChooseButton;

    return (
      <div className='container centered-container'>
        <div className='w-100 text-center mb-5'>
          <h1 className='mb-5'>
            {afterOpponent
              ? 'Your opponent has chosen a move, now choose yours:'
              : 'Choose your move:'}
          </h1>
          <div className="row w-100">
            <div className="col-sm-4">
              {renderChooseButton(choosePlay, Play.Rock, 'Rock', <FontAwesomeIcon icon={faHandRock} size='7x' rotation={90} />)}
            </div>
            <div className="col-sm-4">
              {renderChooseButton(choosePlay, Play.Paper, 'Paper', <FontAwesomeIcon icon={faHandPaper} size='7x' rotation={90} />)}
            </div>
            <div className="col-sm-4">
              {renderChooseButton(choosePlay, Play.Scissors, 'Scissors', <FontAwesomeIcon icon={faHandScissors} size='7x' flip="horizontal" />)}
            </div>
          </div>
          <Button onClick={() => abandonGame()} color="dark" className="w-75 p-3">
            <div className='mb-3'>
              <h1>Abandon game</h1>
            </div>
          </Button>
        </div>
      </div>
    );
  }
}
