import * as React from 'react';
import { StyleSheet, css } from 'aphrodite';

import { Play, Result } from '../game-engine/positions';
import FooterBar from './FooterBar';
import Button from './Button';

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
        return <h3> You won! </h3>;

      case Result.YouLose:
        return <h3> You lost </h3>;

      default:
        return <h3> It's a tie! </h3>;
    }
  }

  render() {
    const { yourPlay, theirPlay, message, playAgain, abandonGame } = this.props;

    return (
      <React.Fragment>
        <h2>The result:</h2>
        <div className={css(styles.fullWidth)}>You chose {Play[yourPlay]}</div>
        <div className={css(styles.fullWidth)}>Your opponent chose {Play[theirPlay]}</div>
        {this.renderResultText()}

        <Button onClick={playAgain}>Play again</Button>
        <Button onClick={abandonGame}>Abandon game</Button>

        <FooterBar>{message}</FooterBar>
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
});
