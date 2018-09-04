import React from 'react';
import { StyleSheet, css } from 'aphrodite';

import { Play } from '../game-engine/positions';
import FooterBar from './FooterBar';

interface Props {
  message: string;
  selectedPlayId?: number;
}

export default class WaitingStep extends React.PureComponent<Props> {
  static defaultProps = {
    selectedPlayId: null,
  };

  render() {
    const { message, selectedPlayId } = this.props;

    return (
      <React.Fragment>
        <h2>Waiting: {message}</h2>
        {selectedPlayId && (
          <div className={css(styles.fullWidth)}>You&apos;ve chosen {Play[selectedPlayId]}</div>
        )}
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
