import React from 'react';
import { StyleSheet, css } from 'aphrodite';

interface Props {
  message: string;
}

export default class ProposeGamePage extends React.PureComponent<Props> {
  render() {
    const { message } = this.props;

    return (
      <div className={css(styles.container)}>
        <div>
          <h1>Game Proposed</h1>

          <div>Waiting for your opponent to accept the game!</div>

          <div className={css(styles.footerBar)}>
            <div className={css(styles.container, styles.message)}>{message}</div>
          </div>
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

  message: {
    paddingTop: 12,
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
