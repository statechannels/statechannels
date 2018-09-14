import React from 'react';
import { StyleSheet, css } from 'aphrodite';

import { Button } from 'reactstrap';

import { Play } from '../game-engine/positions';
import MoveIcon from './MoveIcon';

interface IProps {
  login: () => any;
}

const HomePage: React.SFC<IProps> = ({ login }) => {
  return (
    <div className="container centered-container">
      <div className="w-100">
        <div className="mb-5 text-center">
          <h1 className={css(styles.title)}>Rock, Paper, Scissors</h1>
          <p>
            <em>A State Channel Game</em>
          </p>
        </div>
        <div className="row text-center mb-5">
          <div className="col-sm-4">
            <MoveIcon play={Play.Rock} />
          </div>
          <div className="col-sm-4">
            <MoveIcon play={Play.Paper} />
          </div>
          <div className="col-sm-4">
            <MoveIcon play={Play.Scissors} />
          </div>
        </div>
        <div className="row mb-5">
          <div className="col-sm-12">
            <Button block={true} color="primary" onClick={login}>
              Login
            </Button>
          </div>
        </div>
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
