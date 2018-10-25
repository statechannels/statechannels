import React from 'react';
import { StyleSheet, css } from 'aphrodite';

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
          <div className="homePage-loginButton" onClick={login}>
            <div className="homePage-loginButton-icon-container">
              <img className="homePage-loginButton-icon" src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/32px-Google_%22G%22_Logo.svg.png" />
            </div>
            <div className="homePage-loginButton-text">Sign in with Google</div>
          </div>
        </div>
      </div>
      <div className="homePage-image"/>
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
