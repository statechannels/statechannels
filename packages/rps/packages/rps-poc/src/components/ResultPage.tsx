import * as React from 'react';
import { StyleSheet, css } from 'aphrodite';

import { Play, Result } from '../game-engine/positions';

interface Props {
  yourPlay: Play;
  theirPlay: Play;
  result: Result;
  message: string;
}

export default class ResultPage extends React.PureComponent<Props> {
  render() {
    const { yourPlay, theirPlay, message } = this.props;

    return (
      <div className={css(styles.container)}>
        <div>{message}</div>
        <div>
          <h1>The result:</h1>
        </div>
        <div className={css(styles.fullWidth)}>You chose {Play[yourPlay]}</div>
        <div className={css(styles.fullWidth)}>
          Your opponent chose {Play[theirPlay]}
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
});

