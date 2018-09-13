import * as React from 'react';
import { StyleSheet, css } from 'aphrodite';

export default function Header() {
  return (
    <div className={css(styles.container)}>
      <div className={css(styles.centerNav)}>
        <h3>Rock, Paper, Scissors</h3>
      </div>
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomColor: '#bbb',
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    color: '#fff',
    height: 45,
    width: '100%',
  },

  leftNav: {
    position: 'absolute',
    left: 20,
  },

  centerNav: {
    left: '50%',
    position: 'absolute',
    transform: 'translateX(-50%)',
  },

  rightNav: {
    position: 'absolute',
    right: 20,
    top: 0,
  },

  inlineBlock: {
    display: 'inline-block',
  },

  rightSpacing: {
    marginRight: 16,
  },
});
