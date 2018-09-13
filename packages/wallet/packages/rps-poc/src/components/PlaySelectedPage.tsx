import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandRock, faHandPaper, faHandScissors } from '@fortawesome/free-solid-svg-icons';
import { Play } from '../game-engine/positions';

interface Props {
  message: string;
  yourPlay: Play;
}

export default class PlaySelectedPage extends React.PureComponent<Props> {
  static defaultProps = {
    selectedPlayId: null,
  };

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
    const { message, yourPlay } = this.props;

    return (
      <div className='container centered-container'>
        <div className='w-100 text-center mb-5'>
          <h1 className='mb-5'>Move Chosen!</h1>
          <p className='lead'>You chose <strong>{Play[yourPlay]}</strong></p>

          <div className='mb-5'>
            {this.renderMoveIcon(yourPlay)}
          </div>

          <p>{message}</p>
        </div>
      </div>
    );
  }
}
