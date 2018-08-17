import React from 'react';

import { Play } from '../game-engine/positions';

interface Props {
  choosePlay: (play: Play) => void;
  afterOpponent?: any;
}

export default class SelectPlayStep extends React.PureComponent<Props> {

  renderChooseButton(choosePlay: (play: Play) => void, play: Play, description: string) {
    return (
      <button
      type="button"
      onClick={() => choosePlay(play)}
      style={{ display: 'inline-block', width: '33%' }}
      key={play}
    >
      <div style={{ height: 250, background: 'maroon', margin: 4 }}>
        <div
          style={{
            left: '50%',
            position: 'relative',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'fit-content',
          }}
        >
          <h1>{description}</h1>
        </div>
      </div>
    </button>
    )
  }


  render() {
    const { afterOpponent, choosePlay } = this.props;
    const renderChooseButton = this.renderChooseButton;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>
            {afterOpponent
              ? 'Your opponent has chosen a move, now choose yours:'
              : 'Choose your move:'}
          </h1>
        </div>
        <div style={{ width: '100%' }}>
          { renderChooseButton(choosePlay, Play.Rock, "Rock") }
          { renderChooseButton(choosePlay, Play.Paper, "Paper") }
          { renderChooseButton(choosePlay, Play.Scissors, "Scissors") }
        </div>
      </div>
    );
  }
}

