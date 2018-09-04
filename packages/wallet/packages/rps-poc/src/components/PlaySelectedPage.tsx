import React from 'react';
import { StyleSheet, css } from 'aphrodite';

import { Play } from '../game-engine/positions';

interface Props {
  message: string;
  yourPlay: Play;
}

export default class PlaySelectedPage extends React.PureComponent<Props> {
  static defaultProps = {
    selectedPlayId: null,
  };

  render() {
    const { message, yourPlay } = this.props;

    return (
      <React.Fragment>
        <h1>{message}</h1>
        <div className={css(styles.fullWidth)}>You&apos;ve chosen {Play[yourPlay]}</div>
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
});
