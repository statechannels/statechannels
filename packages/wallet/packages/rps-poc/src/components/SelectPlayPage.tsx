import React, { ReactNode } from 'react';
import { StyleSheet, css } from 'aphrodite';

import { Play } from '../game-engine/positions';
import RockIcon from '../icons/rock_icon';
import PaperIcon from '../icons/paper_icon';
import ScissorsIcon from '../icons/scissors_icon';

interface Props {
  choosePlay: (play: Play) => void;
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
      <button
        type="button"
        onClick={() => choosePlay(play)}
        key={play}
        className={css(styles.buttonContainer)}
      >
        <div className={css(styles.buttonContent)}>
          <h1>{description}</h1>
          {icon}
        </div>
      </button>
    );
  }

  render() {
    const { afterOpponent, choosePlay } = this.props;
    const renderChooseButton = this.renderChooseButton;

    return (
      <React.Fragment>
        <h1>
          {afterOpponent
            ? 'Your opponent has chosen a move, now choose yours:'
            : 'Choose your move:'}
        </h1>
        <div className={css(styles.fullWidth)}>
          {renderChooseButton(choosePlay, Play.Rock, 'Rock', <RockIcon width="100%" />)}
          {renderChooseButton(choosePlay, Play.Paper, 'Paper', <PaperIcon width="100%" />)}
          {renderChooseButton(choosePlay, Play.Scissors, 'Scissors', <ScissorsIcon width="100%" />)}
        </div>
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },

  buttonContent: {
    left: '50%',
    position: 'relative',
    transform: 'translateX(-50%)',
    width: 'fit-content',
    margin: 4,
    paddingBottom: 16,
  },

  buttonContainer: {
    display: 'inline-block',
    width: '33%',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'white',
    borderRadius: 5,

    ':hover': {
      textDecoration: 'underline',
      borderColor: 'black',
    },
  },
});
