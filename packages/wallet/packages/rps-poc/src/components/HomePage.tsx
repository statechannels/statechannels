import React from 'react';
import { StyleSheet, css } from 'aphrodite';

import Button from './Button';
import ButtonLink from './ButtonLink';
import { ROUTE_PATHS } from '../constants';
import RockIcon from '../icons/rock_icon';
import PaperIcon from '../icons/paper_icon';
import ScissorsIcon from '../icons/scissors_icon';

interface IProps {
  login: () => any;
  logout: () => any;
  loggedIn: boolean;
}

const HomePage: React.SFC<IProps> = ({ login, logout, loggedIn }) => {
  let loginButton;
  if (loggedIn) {
    loginButton = <Button onClick={logout}>Logout</Button>;
  } else {
    loginButton = <Button onClick={login}>Login</Button>;
  }

  return (
    <div className={css(styles.container)}>
      <div className={css(styles.centerAligned)}>
        <h1 className={css(styles.title)}>Rock, Paper, Scissors</h1>
        <p>
          <em>A State-Channel Proof-of-Concept Game</em>
        </p>
      </div>
      <div>
        <div className={css(styles.image)}>
          <RockIcon width="100%" />
        </div>
        <div className={css(styles.image)}>
          <PaperIcon width="100%" />
        </div>
        <div className={css(styles.image)}>
          <ScissorsIcon width="100%" />
        </div>
      </div>
      <div className={css(styles.buttons)}>
        {loggedIn && <ButtonLink href={ROUTE_PATHS.HOW_IT_WORKS}>Begin</ButtonLink>}
        {loginButton}
      </div>
    </div>
  );
};

export default HomePage;

const styles = StyleSheet.create({
  container: {
    maxWidth: '90%',
    margin: 'auto',
  },

  image: {
    display: 'inline-block',
    maxWidth: '33%',
  },

  title: {
    marginBottom: 0,
  },

  centerAligned: {
    textAlign: 'center',
  },

  buttons: {
    textAlign: 'center',
    paddingTop: 40,
  },
});
