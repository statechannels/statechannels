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
      <React.Fragment>
        <h1>The result:</h1>
        <div className={css(styles.fullWidth)}>You chose {yourPlay && yourPlay.name}</div>
        <div className={css(styles.fullWidth)}>
          Your opponent chose {theirPlay && theirPlay.name}
        </div>
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
});

export default RevealStep;
