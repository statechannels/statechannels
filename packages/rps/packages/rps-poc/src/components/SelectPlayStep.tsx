import React from 'react';
import { StyleSheet, css } from 'aphrodite';

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
        key={play}
        className={css(styles.buttonContainer)}
      >
        <div className={css(styles.buttonBackground)}>
          <div className={css(styles.buttonContent)}>
            <h1>{description}</h1>
          </div>
        </div>
      </button>
    );
  }

  render() {
    const { afterOpponent, choosePlay } = this.props;
    const renderChooseButton = this.renderChooseButton;

    return (
      <div className={css(styles.container)}>
        <div>
          <h1>
            {afterOpponent
              ? 'Your opponent has chosen a move, now choose yours:'
              : 'Choose your move:'}
          </h1>
        </div>
        <div className={css(styles.fullWidth)}>
          {renderChooseButton(choosePlay, Play.Rock, 'Rock')}
          {renderChooseButton(choosePlay, Play.Paper, 'Paper')}
          {renderChooseButton(choosePlay, Play.Scissors, 'Scissors')}
        </div>
      </div>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '90%',
    margin: 'auto',
  },

  fullWidth: {
    width: '100%',
  },

  buttonContent: {
    left: '50%',
    position: 'relative',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'fit-content',
  },

  buttonBackground: {
    height: 250,
    background: 'maroon',
    margin: 4,
  },

  buttonContainer: {
    display: 'inline-block',
    width: '33%',
  },
});
