import * as React from 'react';
import { StyleSheet, css } from 'aphrodite';

import { PLAY_OPTIONS } from '../constants';

interface IProps {
  selectedMoveId: number;
  opponentMoveId: number;
}

class RevealStep extends React.PureComponent<IProps> {
  render() {
    const { selectedMoveId, opponentMoveId } = this.props;

    const yourPlay = PLAY_OPTIONS.find(option => option.id === selectedMoveId);
    const theirPlay = PLAY_OPTIONS.find(option => option.id === opponentMoveId);

    return (
      <div className={css(styles.container)}>
        <div>
          <h1>The result:</h1>
        </div>
        <div className={css(styles.fullWidth)}>You chose {yourPlay && yourPlay.name}</div>
        <div className={css(styles.fullWidth)}>
          Your opponent chose {theirPlay && theirPlay.name}
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

export default RevealStep;
