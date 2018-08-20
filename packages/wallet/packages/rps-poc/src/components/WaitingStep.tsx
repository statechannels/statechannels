import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, css } from 'aphrodite';

import { Play } from '../game-engine/positions/';

interface Props {
  message: string;
  selectedPlayId?: number;
}

export default class WaitingStep extends React.PureComponent<Props> {
  static propTypes = {
    message: PropTypes.string.isRequired,
    selectedPlayId: PropTypes.number,
  };

  static defaultProps = {
    selectedPlayId: null,
  };

  render() {
    const { message, selectedPlayId } = this.props;

    return (
      <div className={css(styles.container)}>
        <div>
          <h1>Waiting for {message}...</h1>
        </div>
        {selectedPlayId && (
          <div className={css(styles.fullWidth)}>You&apos;ve chosen {Play[selectedPlayId]}</div>
        )}
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
