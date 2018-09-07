import React from 'react';
import { StyleSheet, css } from 'aphrodite';

import Button from './Button';
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
      <div className={css(styles.headerText)}>
        <h1 className={css(styles.title)}>Rock, Paper, Scissors</h1>
        <p>
          <em>A State-Channel Proof-of-Concept Game</em>
        </p>
      </div>
      <div className={css(styles.centeredGroup, styles.icons)}>
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
      <div className={css(styles.centeredGroup, styles.buttons)}>
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

  centeredGroup: {
    left: '50%',
    transform: 'translateX(-50%)',
  },

  icons: {
    position: 'relative',
    width: 'max-content',
  },

  rightPadding: {
    paddingRight: 12,
  },

  headerText: {
    textAlign: 'center',
    paddingBottom: 32,
  },

  buttons: {
    position: 'absolute',
    bottom: 40,
  },
});
