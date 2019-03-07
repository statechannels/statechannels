import React from 'react';
import { StyleSheet, css } from 'aphrodite';
import BG_IMAGE from '../images/homepage_image.png';
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
            <h1 className={css(styles.title)}>Tic Tac Toe</h1>
            <br />
            <p className={css(styles.title)}>[ a ForceMove State Channel Game ]</p>
            <Button className="homePage-loginButton cog-button " onClick={login}>
              Start Playing!
            </Button>
          </div>
        </div>
        <img className="homePage-image" src={BG_IMAGE} />
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
    color: 'white',
    textAlign: 'center',
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
