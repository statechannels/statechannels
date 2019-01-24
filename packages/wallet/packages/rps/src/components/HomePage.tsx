import React from 'react';
import { StyleSheet, css } from 'aphrodite';

import { Button } from 'reactstrap';

interface IProps {
  login: () => any;
}

const HomePage: React.SFC<IProps> = ({ login }) => {
  return (
    <div>
      <div className="homePage">
        <div className="homePage-container">
          <div className="homePage-title-container">
            <h1 className={css(styles.title)}>Welcome to Rock, Paper Scissors</h1>
            <h1 className={css(styles.title)}>State Channel Game</h1>
          </div>
          <Button className="cog-button homePage-loginButton" onClick={login} >
            Start Playing!
          </Button>
        </div>
      </div>
    <div className="homePage-image" />
    </div >
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
    color: 'white',
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
