import React from 'react';
import { StyleSheet, css } from 'aphrodite';

import { Play } from '../game-engine/positions';

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
        <div className={css(styles.container)}>
          <div>
            <h1>
              {message}
              ...
            </h1>
          </div>
          {selectedPlayId && (
            <div className={css(styles.fullWidth)}>You&apos;ve chosen {Play[selectedPlayId]}</div>
          )}
        </div>
        <div className={css(styles.footerBar)}>{message}</div>
      </React.Fragment>
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

  footerBar: {
    position: 'fixed',
    bottom: 0,
    height: 50,
    left: 0,
    right: 0,
    borderTopColor: 'black',
    borderTopStyle: 'solid',
    borderTopWidth: 1,
  },
});
