import * as React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandRock, faHandPaper, faHandScissors } from '@fortawesome/free-solid-svg-icons';
import { Button } from 'reactstrap';

import { Play, Result } from '../game-engine/positions';
import FooterBar from './FooterBar';

interface Props {
  yourPlay: Play;
  theirPlay: Play;
  result: Result;
  message: string;
  abandonGame: () => void;
  playAgain: () => void;
}

export default class ResultPage extends React.PureComponent<Props> {
  renderResultText() {
    const { result } = this.props;

    switch (result) {
      case Result.YouWin:
        return "You won! 🎉";

      case Result.YouLose:
        return "You lost 😭";

      default:
        return "It's a tie! 🙄";
    }
  }

  renderMoveIcon(play: Play) {
    switch (play) {
      case Play.Rock:
        return <FontAwesomeIcon icon={faHandRock} size='7x' rotation={90} />;
      case Play.Paper:
        return <FontAwesomeIcon icon={faHandPaper} size='7x' rotation={90} />;
      case Play.Scissors:
        return <FontAwesomeIcon icon={faHandScissors} size='7x' flip="horizontal" />;
    }
  }

  render() {
    const { yourPlay, theirPlay, message, playAgain, abandonGame } = this.props;

    return (
      <div className='container centered-container'>
        <div className='w-100 text-center mb-5'>
          <h1 className='mb-5'>{this.renderResultText()}</h1>
          <div className='row'>
            <div className='col-sm-6'>
              <p className='lead'>You chose <strong>{Play[yourPlay]}</strong></p>
              <div className='mb-5'>
                {this.renderMoveIcon(yourPlay)}
              </div>
            </div>
            <div className='col-sm-6'>
              <p className='lead'>Your opponent chose <strong>{Play[theirPlay]}</strong></p>
              <div className='mb-5'>
                {this.renderMoveIcon(theirPlay)}
              </div>
            </div>
          </div>


          <Button color='default' onClick={abandonGame}>Abandon game</Button>
          <Button color='primary' onClick={playAgain}>Play again</Button>
        </div>

        <FooterBar>{message}</FooterBar>
      </div>
    );
  }
}
