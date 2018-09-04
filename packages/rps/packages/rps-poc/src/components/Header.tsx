import * as React from 'react';
import { Link } from 'react-router-dom';
import { StyleSheet, css } from 'aphrodite';

import { BRAND_COLOR, ROUTE_PATHS } from '../constants';

export default function Header() {
  return (
    <div className={css(styles.container)}>
      <div className={css(styles.leftNav)}>
        <Link to="/">
          <h3>RPS</h3>
        </Link>
      </div>
      <div className={css(styles.centerNav)}>
        <h3>Rock, Paper, Scissors</h3>
      </div>
      <div className={css(styles.rightNav)}>
        <Link className={css(styles.inlineBlock, styles.rightSpacing)} to="/">
          <h3>Home</h3>
        </Link>
        <Link className={css(styles.inlineBlock)} to={`/${ROUTE_PATHS.ABOUT}`}>
          <h3>About</h3>
        </Link>
      </div>
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BRAND_COLOR,
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
