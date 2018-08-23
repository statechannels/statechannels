import React from 'react';
import { StyleSheet, css } from 'aphrodite';

interface Props {
  message: string;
}

export default class WaitingStep extends React.PureComponent<Props> {
  static defaultProps = {};

  render() {
    const { message } = this.props;

    return (
      <div className={css(styles.container)}>
        <div>
          <h1>
            Waiting for {message}
            ...
          </h1>
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
